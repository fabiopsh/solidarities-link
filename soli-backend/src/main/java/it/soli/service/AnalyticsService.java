package it.soli.service;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.persistence.EntityManager;
import jakarta.persistence.Query;
import jakarta.inject.Inject;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;

/**
 * Read-only aggregated analytics over the SOLI dataset for the Open Data API.
 * All results are aggregates (counts, averages, series) — no personal data or
 * individual identifiers are ever returned. Geographic aggregation is coarse and
 * cells with a low count are suppressed (k-anonymity).
 */
@ApplicationScoped
public class AnalyticsService {

    private static final int GEO_MIN_CELL = 3; // suppress grid cells below this count

    @Inject
    EntityManager em;

    // ---------------------------------------------------------------- helpers
    private long scalarLong(String sql) {
        Object r = em.createNativeQuery(sql).getSingleResult();
        return r == null ? 0L : ((Number) r).longValue();
    }

    private double scalarDouble(String sql) {
        Object r = em.createNativeQuery(sql).getSingleResult();
        return r == null ? 0.0 : ((Number) r).doubleValue();
    }

    @SuppressWarnings("unchecked")
    private List<Object[]> rows(Query q) {
        return q.getResultList();
    }

    private static long num(Object o) {
        return o == null ? 0L : ((Number) o).longValue();
    }

    private static double dbl(Object o) {
        return o == null ? 0.0 : ((Number) o).doubleValue();
    }

    private static String grain(String granularity) {
        if (granularity == null) return "day";
        switch (granularity.toLowerCase()) {
            case "week": return "week";
            case "month": return "month";
            default: return "day";
        }
    }

    // ---------------------------------------------------------------- overview
    public Map<String, Object> overview() {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("users", scalarLong("SELECT count(*) FROM soli_users"));
        m.put("volunteers", scalarLong("SELECT count(*) FROM soli_volunteer_profiles"));
        m.put("tasksTotal", scalarLong("SELECT count(*) FROM soli_tasks"));
        m.put("tasksCompleted", scalarLong("SELECT count(*) FROM soli_tasks WHERE status='COMPLETED'"));
        m.put("tasksOpen", scalarLong("SELECT count(*) FROM soli_tasks WHERE status IN ('OPEN','NOTIFIED')"));
        m.put("tasksInProgress", scalarLong("SELECT count(*) FROM soli_tasks WHERE status IN ('ACCEPTED','IN_PROGRESS')"));
        m.put("creditsEarned", scalarLong("SELECT COALESCE(sum(amount),0) FROM soli_transactions WHERE transaction_type='EARN_TASK_REWARD'"));
        m.put("creditsSpent", scalarLong("SELECT COALESCE(-sum(amount),0) FROM soli_transactions WHERE transaction_type='SPEND_DONATION'"));
        m.put("creditsInCirculation", scalarLong("SELECT COALESCE(sum(balance),0) FROM soli_wallets"));
        m.put("charitiesActive", scalarLong("SELECT count(*) FROM soli_charities WHERE is_active=true"));
        m.put("redemptions", scalarLong("SELECT count(*) FROM soli_redemptions"));
        m.put("associations", scalarLong("SELECT count(*) FROM soli_associations"));
        m.put("reports", scalarLong("SELECT count(*) FROM soli_reports"));
        return m;
    }

    // ------------------------------------------------------------ tasks splits
    public List<Map<String, Object>> tasksByCategory() {
        List<Object[]> rs = rows(em.createNativeQuery(
                "SELECT category, count(*) AS total, " +
                " count(*) FILTER (WHERE status='COMPLETED') AS completed, " +
                " COALESCE(round(avg(reward_credits) FILTER (WHERE status='COMPLETED'),1),0) AS avg_credits " +
                "FROM soli_tasks GROUP BY category ORDER BY total DESC"));
        List<Map<String, Object>> out = new ArrayList<>();
        for (Object[] r : rs) {
            long total = num(r[1]);
            long completed = num(r[2]);
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("category", r[0]);
            m.put("total", total);
            m.put("completed", completed);
            m.put("completionRate", total == 0 ? 0.0 : Math.round((completed * 1000.0 / total)) / 10.0);
            m.put("avgCredits", dbl(r[3]));
            out.add(m);
        }
        return out;
    }

    public List<Map<String, Object>> tasksByUrgency() {
        List<Object[]> rs = rows(em.createNativeQuery(
                "SELECT urgency_level, count(*) AS total, count(*) FILTER (WHERE status='COMPLETED') AS completed " +
                "FROM soli_tasks GROUP BY urgency_level " +
                "ORDER BY CASE urgency_level WHEN 'LOW' THEN 1 WHEN 'MEDIUM' THEN 2 WHEN 'HIGH' THEN 3 WHEN 'CRITICAL' THEN 4 ELSE 5 END"));
        List<Map<String, Object>> out = new ArrayList<>();
        for (Object[] r : rs) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("urgency", r[0]);
            m.put("total", num(r[1]));
            m.put("completed", num(r[2]));
            out.add(m);
        }
        return out;
    }

    public List<Map<String, Object>> tasksByStatus() {
        List<Object[]> rs = rows(em.createNativeQuery(
                "SELECT status, count(*) FROM soli_tasks GROUP BY status ORDER BY count(*) DESC"));
        List<Map<String, Object>> out = new ArrayList<>();
        for (Object[] r : rs) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("status", r[0]);
            m.put("count", num(r[1]));
            out.add(m);
        }
        return out;
    }

    // -------------------------------------------------------------- timeseries
    public List<Map<String, Object>> tasksTimeseries(LocalDate from, LocalDate to, String granularity) {
        String g = grain(granularity);
        LocalDateTime fromTs = (from != null ? from : LocalDate.now().minusDays(90)).atStartOfDay();
        LocalDateTime toTs = (to != null ? to : LocalDate.now().plusDays(30)).atTime(23, 59, 59);

        Query cq = em.createNativeQuery(
                "SELECT date_trunc(?1, created_at) p, count(*) FROM soli_tasks " +
                "WHERE created_at BETWEEN ?2 AND ?3 GROUP BY p");
        cq.setParameter(1, g).setParameter(2, fromTs).setParameter(3, toTs);

        Query dq = em.createNativeQuery(
                "SELECT date_trunc(?1, check_out_at) p, count(*) FROM soli_tasks " +
                "WHERE status='COMPLETED' AND check_out_at BETWEEN ?2 AND ?3 GROUP BY p");
        dq.setParameter(1, g).setParameter(2, fromTs).setParameter(3, toTs);

        Map<String, long[]> merged = new TreeMap<>();
        for (Object[] r : rows(cq)) {
            merged.computeIfAbsent(String.valueOf(r[0]), k -> new long[2])[0] = num(r[1]);
        }
        for (Object[] r : rows(dq)) {
            merged.computeIfAbsent(String.valueOf(r[0]), k -> new long[2])[1] = num(r[1]);
        }
        List<Map<String, Object>> out = new ArrayList<>();
        for (Map.Entry<String, long[]> e : merged.entrySet()) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("period", e.getKey());
            m.put("created", e.getValue()[0]);
            m.put("completed", e.getValue()[1]);
            out.add(m);
        }
        return out;
    }

    public List<Map<String, Object>> creditsTimeseries(LocalDate from, LocalDate to, String granularity) {
        String g = grain(granularity);
        LocalDateTime fromTs = (from != null ? from : LocalDate.now().minusDays(90)).atStartOfDay();
        LocalDateTime toTs = (to != null ? to : LocalDate.now().plusDays(1)).atTime(23, 59, 59);
        Query q = em.createNativeQuery(
                "SELECT date_trunc(?1, timestamp) p, " +
                " COALESCE(sum(amount) FILTER (WHERE transaction_type='EARN_TASK_REWARD'),0) earned, " +
                " COALESCE(-sum(amount) FILTER (WHERE transaction_type='SPEND_DONATION'),0) spent " +
                "FROM soli_transactions WHERE timestamp BETWEEN ?2 AND ?3 GROUP BY p ORDER BY p");
        q.setParameter(1, g).setParameter(2, fromTs).setParameter(3, toTs);
        List<Map<String, Object>> out = new ArrayList<>();
        for (Object[] r : rows(q)) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("period", String.valueOf(r[0]));
            m.put("earned", num(r[1]));
            m.put("spent", num(r[2]));
            out.add(m);
        }
        return out;
    }

    // --------------------------------------------------------------------- geo
    public List<Map<String, Object>> geoByCity() {
        List<Object[]> rs = rows(em.createNativeQuery(
                "SELECT COALESCE(target_location,'N/D') city, count(*) total, " +
                " count(*) FILTER (WHERE status='COMPLETED') completed, " +
                " COALESCE(round(avg(reward_credits) FILTER (WHERE status='COMPLETED'),1),0) avg_credits " +
                "FROM soli_tasks GROUP BY city ORDER BY total DESC"));
        List<Map<String, Object>> out = new ArrayList<>();
        for (Object[] r : rs) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("city", r[0]);
            m.put("tasks", num(r[1]));
            m.put("completed", num(r[2]));
            m.put("avgCredits", dbl(r[3]));
            out.add(m);
        }
        return out;
    }

    public List<Map<String, Object>> geoGrid(int precision) {
        int p = Math.max(1, Math.min(precision, 4));
        Query q = em.createNativeQuery(
                "SELECT round(latitude::numeric, ?1) glat, round(longitude::numeric, ?1) glon, count(*) c " +
                "FROM soli_tasks WHERE latitude IS NOT NULL AND longitude IS NOT NULL " +
                "GROUP BY glat, glon HAVING count(*) >= ?2 ORDER BY c DESC");
        q.setParameter(1, p).setParameter(2, GEO_MIN_CELL);
        List<Map<String, Object>> out = new ArrayList<>();
        for (Object[] r : rows(q)) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("lat", dbl(r[0]));
            m.put("lon", dbl(r[1]));
            m.put("count", num(r[2]));
            out.add(m);
        }
        return out;
    }

    // ----------------------------------------------------------------- credits
    public Map<String, Object> credits() {
        Map<String, Object> m = new LinkedHashMap<>();
        long earned = scalarLong("SELECT COALESCE(sum(amount),0) FROM soli_transactions WHERE transaction_type='EARN_TASK_REWARD'");
        long spent = scalarLong("SELECT COALESCE(-sum(amount),0) FROM soli_transactions WHERE transaction_type='SPEND_DONATION'");
        m.put("totalEarned", earned);
        m.put("totalSpent", spent);
        m.put("inCirculation", scalarLong("SELECT COALESCE(sum(balance),0) FROM soli_wallets"));
        m.put("avgPerCompletedTask", scalarDouble(
                "SELECT COALESCE(round(avg(reward_credits),1),0) FROM soli_tasks WHERE status='COMPLETED'"));
        m.put("transactions", scalarLong("SELECT count(*) FROM soli_transactions"));
        return m;
    }

    // ------------------------------------------------------------ volunteering
    public Map<String, Object> volunteering() {
        Map<String, Object> m = new LinkedHashMap<>();
        long active = scalarLong("SELECT count(DISTINCT volunteer_id) FROM soli_tasks WHERE status='COMPLETED' AND volunteer_id IS NOT NULL");
        long completed = scalarLong("SELECT count(*) FROM soli_tasks WHERE status='COMPLETED'");
        m.put("activeVolunteers", active);
        m.put("registeredVolunteers", scalarLong("SELECT count(*) FROM soli_volunteer_profiles"));
        m.put("avgTasksPerActiveVolunteer", active == 0 ? 0.0 : Math.round(completed * 10.0 / active) / 10.0);
        m.put("avgResponseMinutes", scalarDouble(
                "SELECT COALESCE(round(avg(EXTRACT(EPOCH FROM (accepted_at - created_at))/60.0)::numeric,1),0) " +
                "FROM soli_tasks WHERE accepted_at IS NOT NULL"));
        List<Object[]> cov = rows(em.createNativeQuery(
                "SELECT category, count(*) FROM soli_volunteer_service_categories GROUP BY category ORDER BY count(*) DESC"));
        List<Map<String, Object>> coverage = new ArrayList<>();
        for (Object[] r : cov) {
            Map<String, Object> c = new LinkedHashMap<>();
            c.put("category", r[0]);
            c.put("volunteers", num(r[1]));
            coverage.add(c);
        }
        m.put("categoriesCoverage", coverage);
        return m;
    }

    // ----------------------------------------------------------------- impact
    public Map<String, Object> impact() {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("volunteerHours", scalarDouble(
                "SELECT COALESCE(round((sum(EXTRACT(EPOCH FROM (check_out_at - check_in_at)))/3600.0)::numeric,1),0) " +
                "FROM soli_tasks WHERE status='COMPLETED' AND check_in_at IS NOT NULL AND check_out_at IS NOT NULL"));
        m.put("beneficiariesHelped", scalarLong("SELECT count(DISTINCT beneficiary_id) FROM soli_tasks WHERE status='COMPLETED'"));
        m.put("tasksCompleted", scalarLong("SELECT count(*) FROM soli_tasks WHERE status='COMPLETED'"));
        m.put("creditsDonated", scalarLong("SELECT COALESCE(sum(credits_spent),0) FROM soli_redemptions"));
        List<Object[]> rs = rows(em.createNativeQuery(
                "SELECT c.cause, count(r.id), COALESCE(sum(r.credits_spent),0) " +
                "FROM soli_redemptions r JOIN soli_charities c ON c.id = r.charity_id " +
                "GROUP BY c.cause ORDER BY 3 DESC"));
        List<Map<String, Object>> byCause = new ArrayList<>();
        for (Object[] r : rs) {
            Map<String, Object> c = new LinkedHashMap<>();
            c.put("cause", r[0]);
            c.put("redemptions", num(r[1]));
            c.put("creditsDonated", num(r[2]));
            byCause.add(c);
        }
        m.put("byCause", byCause);
        return m;
    }

    // -------------------------------------------------------------- charities
    public List<Map<String, Object>> charitiesStats() {
        List<Object[]> rs = rows(em.createNativeQuery(
                "SELECT c.name, c.cause, c.cost_in_credits, c.stock_remaining, " +
                " (SELECT count(*) FROM soli_redemptions r WHERE r.charity_id=c.id) redemptions, " +
                " (SELECT COALESCE(sum(r.credits_spent),0) FROM soli_redemptions r WHERE r.charity_id=c.id) collected " +
                "FROM soli_charities c WHERE c.is_active=true ORDER BY redemptions DESC"));
        List<Map<String, Object>> out = new ArrayList<>();
        for (Object[] r : rs) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("name", r[0]);
            m.put("cause", r[1]);
            m.put("costInCredits", num(r[2]));
            m.put("stockRemaining", num(r[3]));
            m.put("redemptions", num(r[4]));
            m.put("creditsCollected", num(r[5]));
            out.add(m);
        }
        return out;
    }

    // ------------------------------------------------------------- references
    public Map<String, Object> categories() {
        Map<String, Object> m = new LinkedHashMap<>();
        Map<String, Double> cat = new LinkedHashMap<>();
        cat.put("MOBILITY", 1.2);
        cat.put("PHYSICAL_SUPPORT", 1.5);
        cat.put("SOCIAL", 1.0);
        cat.put("PET_SUPPORT", 1.1);
        cat.put("DIGITAL", 1.1);
        Map<String, Double> urg = new LinkedHashMap<>();
        urg.put("LOW", 1.0);
        urg.put("MEDIUM", 1.25);
        urg.put("HIGH", 1.5);
        urg.put("CRITICAL", 2.0);
        m.put("categories", cat);
        m.put("urgencyLevels", urg);
        m.put("baseCreditsPerHour", 6);
        return m;
    }

    public Map<String, Object> meta() {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("dataset", "SOLI — Solidarities Link Open Data");
        m.put("version", "v1");
        m.put("license", "CC-BY 4.0");
        m.put("privacy", "Solo dati aggregati; nessun dato personale. Geolocalizzazione aggregata (celle < 3 soppresse).");
        Object last = em.createNativeQuery("SELECT max(updated_at) FROM soli_tasks").getSingleResult();
        m.put("lastUpdated", last);
        List<?> cities = em.createNativeQuery(
                "SELECT DISTINCT target_location FROM soli_tasks WHERE target_location IS NOT NULL ORDER BY 1").getResultList();
        m.put("cities", cities);
        m.put("auth", "Header 'X-API-Key: <token>' (token emesso dall'amministratore).");
        return m;
    }

    // ============================================================ SMART STATS

    /** Enriched per-city comparison table (KPI ranking). */
    public List<Map<String, Object>> cities() {
        List<Object[]> rs = rows(em.createNativeQuery(
                "SELECT target_location city, count(*) total, " +
                " count(*) FILTER (WHERE status='COMPLETED') completed, " +
                " COALESCE(round(avg(reward_credits) FILTER (WHERE status='COMPLETED'),1),0) avg_credits, " +
                " COALESCE(round(avg(EXTRACT(EPOCH FROM (accepted_at-created_at))/60.0) FILTER (WHERE accepted_at IS NOT NULL)::numeric,1),0) avg_response, " +
                " count(DISTINCT volunteer_id) FILTER (WHERE volunteer_id IS NOT NULL) volunteers, " +
                " COALESCE(sum(reward_credits),0) credits, " +
                " count(*) FILTER (WHERE status IN ('OPEN','NOTIFIED')) open_tasks " +
                "FROM soli_tasks WHERE target_location IS NOT NULL GROUP BY city ORDER BY total DESC"));
        List<Map<String, Object>> out = new ArrayList<>();
        for (Object[] r : rs) {
            long total = num(r[1]);
            long completed = num(r[2]);
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("city", r[0]);
            m.put("tasks", total);
            m.put("completed", completed);
            m.put("completionRate", total == 0 ? 0.0 : Math.round(completed * 1000.0 / total) / 10.0);
            m.put("avgCredits", dbl(r[3]));
            m.put("avgResponseMinutes", dbl(r[4]));
            m.put("activeVolunteers", num(r[5]));
            m.put("creditsEarned", num(r[6]));
            m.put("openTasks", num(r[7]));
            out.add(m);
        }
        return out;
    }

    /** Full analytics report for a single city. */
    public Map<String, Object> cityReport(String city) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("city", city);
        m.put("tasksTotal", cityScalar("SELECT count(*) FROM soli_tasks WHERE lower(target_location)=lower(?1)", city));
        long completed = cityScalar("SELECT count(*) FROM soli_tasks WHERE status='COMPLETED' AND lower(target_location)=lower(?1)", city);
        long total = (long) m.get("tasksTotal");
        m.put("completed", completed);
        m.put("completionRate", total == 0 ? 0.0 : Math.round(completed * 1000.0 / total) / 10.0);
        m.put("openTasks", cityScalar("SELECT count(*) FROM soli_tasks WHERE status IN ('OPEN','NOTIFIED') AND lower(target_location)=lower(?1)", city));
        m.put("activeVolunteers", cityScalar("SELECT count(DISTINCT volunteer_id) FROM soli_tasks WHERE status='COMPLETED' AND volunteer_id IS NOT NULL AND lower(target_location)=lower(?1)", city));
        m.put("beneficiariesHelped", cityScalar("SELECT count(DISTINCT beneficiary_id) FROM soli_tasks WHERE status='COMPLETED' AND lower(target_location)=lower(?1)", city));
        m.put("creditsEarned", cityScalar("SELECT COALESCE(sum(reward_credits),0) FROM soli_tasks WHERE lower(target_location)=lower(?1)", city));
        m.put("avgResponseMinutes", cityScalarDouble("SELECT COALESCE(round(avg(EXTRACT(EPOCH FROM (accepted_at-created_at))/60.0)::numeric,1),0) FROM soli_tasks WHERE accepted_at IS NOT NULL AND lower(target_location)=lower(?1)", city));
        m.put("avgDurationMinutes", cityScalarDouble("SELECT COALESCE(round(avg(EXTRACT(EPOCH FROM (check_out_at-check_in_at))/60.0)::numeric,1),0) FROM soli_tasks WHERE check_in_at IS NOT NULL AND check_out_at IS NOT NULL AND lower(target_location)=lower(?1)", city));

        Query catQ = em.createNativeQuery(
                "SELECT category, count(*) total, count(*) FILTER (WHERE status='COMPLETED') completed " +
                "FROM soli_tasks WHERE lower(target_location)=lower(?1) GROUP BY category ORDER BY total DESC");
        catQ.setParameter(1, city);
        List<Map<String, Object>> byCat = new ArrayList<>();
        for (Object[] r : rows(catQ)) {
            Map<String, Object> c = new LinkedHashMap<>();
            c.put("category", r[0]);
            c.put("total", num(r[1]));
            c.put("completed", num(r[2]));
            byCat.add(c);
        }
        m.put("byCategory", byCat);

        Query urgQ = em.createNativeQuery(
                "SELECT urgency_level, count(*) FROM soli_tasks WHERE lower(target_location)=lower(?1) GROUP BY urgency_level");
        urgQ.setParameter(1, city);
        List<Map<String, Object>> byUrg = new ArrayList<>();
        for (Object[] r : rows(urgQ)) {
            Map<String, Object> c = new LinkedHashMap<>();
            c.put("urgency", r[0]);
            c.put("count", num(r[1]));
            byUrg.add(c);
        }
        m.put("byUrgency", byUrg);
        return m;
    }

    private long cityScalar(String sql, String city) {
        Object r = em.createNativeQuery(sql).setParameter(1, city).getSingleResult();
        return r == null ? 0L : ((Number) r).longValue();
    }

    private double cityScalarDouble(String sql, String city) {
        Object r = em.createNativeQuery(sql).setParameter(1, city).getSingleResult();
        return r == null ? 0.0 : ((Number) r).doubleValue();
    }

    /** Demand (open tasks) vs supply (volunteers) per category — coverage gap. */
    public List<Map<String, Object>> demandSupply() {
        List<Object[]> rs = rows(em.createNativeQuery(
                "SELECT c.category, " +
                " (SELECT count(*) FROM soli_tasks t WHERE t.category=c.category AND t.status IN ('OPEN','NOTIFIED')) open_tasks, " +
                " (SELECT count(*) FROM soli_volunteer_service_categories v WHERE v.category=c.category) volunteers " +
                "FROM (SELECT DISTINCT category FROM soli_tasks) c ORDER BY open_tasks DESC"));
        List<Map<String, Object>> out = new ArrayList<>();
        for (Object[] r : rs) {
            long open = num(r[1]);
            long vol = num(r[2]);
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("category", r[0]);
            m.put("openTasks", open);
            m.put("volunteers", vol);
            m.put("openPerVolunteer", vol == 0 ? null : Math.round(open * 100.0 / vol) / 100.0);
            out.add(m);
        }
        return out;
    }

    /** Lifecycle funnel from creation to completion. */
    public Map<String, Object> funnel() {
        Map<String, Object> m = new LinkedHashMap<>();
        long created = scalarLong("SELECT count(*) FROM soli_tasks");
        long accepted = scalarLong("SELECT count(*) FROM soli_tasks WHERE accepted_at IS NOT NULL");
        long inProgress = scalarLong("SELECT count(*) FROM soli_tasks WHERE check_in_at IS NOT NULL");
        long completed = scalarLong("SELECT count(*) FROM soli_tasks WHERE status='COMPLETED'");
        m.put("created", created);
        m.put("accepted", accepted);
        m.put("inProgress", inProgress);
        m.put("completed", completed);
        m.put("cancelled", scalarLong("SELECT count(*) FROM soli_tasks WHERE status='CANCELLED'"));
        m.put("released", scalarLong("SELECT count(*) FROM soli_tasks WHERE status='RELEASED'"));
        m.put("acceptanceRate", created == 0 ? 0.0 : Math.round(accepted * 1000.0 / created) / 10.0);
        m.put("completionRate", created == 0 ? 0.0 : Math.round(completed * 1000.0 / created) / 10.0);
        return m;
    }

    /** Task creation distribution by weekday (0=Domenica..6=Sabato). */
    public List<Map<String, Object>> tasksByWeekday() {
        String[] names = {"Domenica", "Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato"};
        Map<Integer, Long> counts = new LinkedHashMap<>();
        for (Object[] r : rows(em.createNativeQuery(
                "SELECT EXTRACT(DOW FROM created_at)::int d, count(*) FROM soli_tasks GROUP BY d"))) {
            counts.put(((Number) r[0]).intValue(), num(r[1]));
        }
        List<Map<String, Object>> out = new ArrayList<>();
        for (int i = 0; i < 7; i++) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("weekday", names[i]);
            m.put("count", counts.getOrDefault(i, 0L));
            out.add(m);
        }
        return out;
    }

    /** Task creation distribution by hour of day (0..23). */
    public List<Map<String, Object>> tasksByHour() {
        Map<Integer, Long> counts = new LinkedHashMap<>();
        for (Object[] r : rows(em.createNativeQuery(
                "SELECT EXTRACT(HOUR FROM created_at)::int h, count(*) FROM soli_tasks GROUP BY h"))) {
            counts.put(((Number) r[0]).intValue(), num(r[1]));
        }
        List<Map<String, Object>> out = new ArrayList<>();
        for (int i = 0; i < 24; i++) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("hour", i);
            m.put("count", counts.getOrDefault(i, 0L));
            out.add(m);
        }
        return out;
    }
}
