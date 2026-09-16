package it.soli.integration.cassitrack;

import it.soli.integration.cassitrack.dto.*;
import it.soli.integration.faro.GeoUtils;
import jakarta.annotation.PostConstruct;
import jakarta.enterprise.context.ApplicationScoped;
import org.jboss.logging.Logger;

import java.security.SecureRandom;
import java.time.*;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.concurrent.CopyOnWriteArrayList;

/**
 * In-memory simulation of the CassiTrack REST API.
 *
 * Seeds the urban TPL network of Cassino as described in the partner's document: three ring lines starting from
 * Piazza San Benedetto (LINEA_1 Folcara/Ausonia, LINEA_2 Liceo/Giardinetti, LINEA_3 Ospedale/XX Settembre),
 * MAGNI-00x vehicles with OBU and a fleet registry. Vehicle positions are derived from the clock (commercial speed,
 * dwell time, headway), so the map moves at every poll like the MQTT feed would; delay is applied to the position,
 * crowding follows the daily demand profile (occ x 0.6 passengers). Active incidents follow CassiTrack's
 * roadmap item C-01 with the contract proposed by SOLI.
 */
@ApplicationScoped
public class MockCassiTrackClient implements CassiTrackClient {

    private static final Logger LOG = Logger.getLogger(MockCassiTrackClient.class);

    static final String USERNAME = "soli-partner@cassitrack.it";
    static final String PASSWORD = "soli-ct-demo";
    static final ZoneId ZONE = ZoneId.of("Europe/Rome");

    static final double ROAD_FACTOR = 1.35;
    static final double BUS_METERS_PER_MINUTE = 18_000 / 60.0;
    static final double DWELL_MINUTES = 0.5;
    private static final int LIVE_WINDOW_MINUTES = 60;
    private static final int SCHEDULE_WINDOW_MINUTES = 120;

    record StopSeed(String id, String name, double lat, double lon) {
    }

    /** Ring line: the last stop connects back to the first one. */
    record RouteSeed(String id, String shortName, String longName, String color, List<String> stopIds, int plannedVehicles) {
    }

    record VehicleSeed(String vehicleId, int busId, String plate, int seats, boolean accessible, String routeId, int slot, int baseDelay) {
    }

    /** State of a vehicle at a given instant. */
    record Snapshot(VehicleSeed vehicle, double lat, double lon, double speedKmh, double heading, int delayMinutes,
                    int nextStopIndex, double minutesToNextStop, double minuteInLoop, int passengers, String crowding) {
    }

    /** Next pass of a line at a stop. */
    record Pass(String routeId, String vehicleId, Instant estimated, Instant scheduled, int delayMinutes, String crowding, boolean realtime) {
    }

    private final SecureRandom random = new SecureRandom();
    private final Set<String> tokens = new HashSet<>();
    private final Map<String, StopSeed> stops = new LinkedHashMap<>();
    private final Map<String, RouteSeed> routes = new LinkedHashMap<>();
    /** Per route: minute offset of each stop from the first one; last element = loop duration. */
    private final Map<String, double[]> offsets = new HashMap<>();
    private final List<VehicleSeed> vehicles = new ArrayList<>();
    private final List<CtBus> buses = new ArrayList<>();
    private final List<CtIncident> reported = new CopyOnWriteArrayList<>();

    @PostConstruct
    void seed() {
        stop("PSB", "Piazza San Benedetto", 41.4935, 13.8318);
        stop("MUN", "Municipio - Piazza De Gasperi", 41.4917, 13.8338);
        stop("COR", "Corso della Repubblica", 41.4958, 13.8300);
        stop("XXS", "Via XX Settembre", 41.4903, 13.8356);
        stop("GAR", "Via Garigliano", 41.4882, 13.8296);
        stop("STZ", "Stazione FS", 41.4858, 13.8236);
        stop("SPA", "Via San Pasquale", 41.4790, 13.8276);
        stop("OSP", "Ospedale Santa Scolastica", 41.4742, 13.8292);
        stop("AUS", "Via Ausonia", 41.4876, 13.8408);
        stop("FOL", "Via Folcara", 41.4950, 13.8432);
        stop("UNI", "Università - Campus Folcara", 41.4978, 13.8478);
        stop("DIS", "Residenza Lazio DiSCo", 41.5004, 13.8452);
        stop("LIC", "Liceo Scientifico", 41.4996, 13.8270);
        stop("CAS", "Via Casilina Nord", 41.5036, 13.8316);
        stop("GIA", "Giardinetti", 41.4972, 13.8204);
        stop("COL", "Colosseo - Anfiteatro romano", 41.4893, 13.8148);

        route("LINEA_1", "1", "Anello Folcara / Ausonia", "#E53935", List.of("PSB", "MUN", "AUS", "FOL", "UNI", "DIS", "COR"), 1);
        route("LINEA_2", "2", "Anello Liceo / Giardinetti", "#8E24AA", List.of("PSB", "COR", "LIC", "CAS", "GIA", "COL", "GAR"), 2);
        route("LINEA_3", "3", "Anello Ospedale / XX Settembre", "#F9A825", List.of("PSB", "GAR", "STZ", "SPA", "OSP", "XXS"), 2);

        vehicles.add(new VehicleSeed("MAGNI-001", 1, "DL 420 GH", 40, true, "LINEA_1", 0, 1));
        vehicles.add(new VehicleSeed("MAGNI-002", 2, "DL 387 KJ", 40, true, "LINEA_2", 0, 2));
        vehicles.add(new VehicleSeed("MAGNI-003", 3, "DL 501 MN", 35, false, "LINEA_3", 0, 2));
        vehicles.add(new VehicleSeed("MAGNI-004", 4, "DL 212 QR", 35, true, "LINEA_3", 1, 0));
        for (VehicleSeed v : vehicles) {
            buses.add(new CtBus(v.busId(), v.vehicleId(), v.plate(), v.seats(), v.accessible(), true));
        }
        // Second vehicle of LINEA_2 is in maintenance: its trips are served by timetable only (no OBU data)
        buses.add(new CtBus(5, null, "DL 809 XZ", 28, false, false));

        LOG.infof("[CassiTrack mock] Cassino network ready: %d stops, %d routes, %d vehicles with OBU, fleet of %d buses",
                stops.size(), routes.size(), vehicles.size(), buses.size());
    }

    private void stop(String id, String name, double lat, double lon) {
        stops.put(id, new StopSeed(id, name, lat, lon));
    }

    private void route(String id, String shortName, String longName, String color, List<String> stopIds, int plannedVehicles) {
        routes.put(id, new RouteSeed(id, shortName, longName, color, stopIds, plannedVehicles));
        double[] off = new double[stopIds.size() + 1];
        for (int i = 0; i < stopIds.size(); i++) {
            StopSeed from = stops.get(stopIds.get(i));
            StopSeed to = stops.get(stopIds.get((i + 1) % stopIds.size()));
            double meters = GeoUtils.distanceMeters(from.lat(), from.lon(), to.lat(), to.lon()) * ROAD_FACTOR;
            off[i + 1] = off[i] + DWELL_MINUTES + meters / BUS_METERS_PER_MINUTE;
        }
        offsets.put(id, off);
    }

    // ── Auth ────────────────────────────────────────────────────────────

    @Override
    public synchronized CtSession login(CtLoginRequest credentials) {
        simulateLatency();
        if (credentials == null || !USERNAME.equals(credentials.email()) || !PASSWORD.equals(credentials.password())) {
            throw new CtApiException(400, "Credenziali non valide");
        }
        byte[] raw = new byte[32];
        random.nextBytes(raw);
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(raw);
        tokens.add(token);
        return new CtSession("cassitrack_jwt", token);
    }

    private synchronized void requireSession(CtSession session) {
        if (session == null || !"cassitrack_jwt".equals(session.cookieName()) || !tokens.contains(session.token())) {
            throw new CtApiException(401, "Cookie cassitrack_jwt mancante o non valido");
        }
    }

    // ── Open data ───────────────────────────────────────────────────────

    @Override
    public List<CtVehicleStatus> vehicles() {
        simulateLatency();
        Instant now = Instant.now();
        String ts = iso(now);
        return vehicles.stream().map(v -> {
            Snapshot s = snapshot(v, now);
            RouteSeed r = routes.get(v.routeId());
            String next = r.stopIds().get(s.nextStopIndex());
            return new CtVehicleStatus(v.vehicleId(), round5(s.lat()), round5(s.lon()), s.speedKmh(), s.heading(), r.id(),
                    r.shortName() + " - " + r.longName(), scheduleStatus(s.delayMinutes()), s.delayMinutes(), next,
                    stops.get(next).name(), (int) Math.round(s.minutesToNextStop() * 60), s.passengers(), s.crowding(), ts, true);
        }).toList();
    }

    @Override
    public long fleetSize() {
        simulateLatency();
        return buses.size();
    }

    @Override
    public List<CtStopArrival> arrivals(String stopId) {
        simulateLatency();
        if (!stops.containsKey(stopId)) {
            return List.of();
        }
        Instant now = Instant.now();
        return livePasses(stopId, now, now.plus(Duration.ofMinutes(LIVE_WINDOW_MINUTES))).stream()
                .map(p -> toArrival(p, stopId)).toList();
    }

    @Override
    public List<CtStopArrival> schedule(String stopId) {
        simulateLatency();
        if (stopId == null || !stopId.matches("[A-Za-z0-9_]{1,50}")) {
            throw new CtApiException(400, "Stop ID non valido");
        }
        if (!stops.containsKey(stopId)) {
            throw new CtApiException(400, "Stop ID non valido");
        }
        Instant now = Instant.now();
        return scheduledPasses(stopId, now, now.plus(Duration.ofMinutes(SCHEDULE_WINDOW_MINUTES)), false).stream()
                .map(p -> toArrival(p, stopId)).toList();
    }

    @Override
    public List<CtRouteGeometry> routes() {
        simulateLatency();
        return routes.values().stream().map(r -> new CtRouteGeometry(r.id(), r.shortName(), r.longName(), r.color(),
                r.stopIds().stream().map(stops::get)
                        .map(s -> new CtRouteGeometry.Stop(s.id(), s.name(), s.lat(), s.lon())).toList())).toList();
    }

    @Override
    public List<CtIncident> incidents() {
        simulateLatency();
        return activeIncidents(Instant.now());
    }

    // ── Partner (cookie) ────────────────────────────────────────────────

    @Override
    public CtAnalytics.Summary analyticsSummary(CtSession session) {
        simulateLatency();
        requireSession(session);
        Instant now = Instant.now();
        int trips = 0;
        for (RouteSeed r : routes.values()) {
            double headway = loop(r.id()) / r.plannedVehicles();
            trips += (int) Math.max(0, (minuteOfDay(now) - 6 * 60) / headway);
        }
        List<CtAnalytics.DelayByRoute.Point> points = delaySeries(now);
        long onTime = points.stream().filter(p -> p.avgDelayMinutes() <= 3).count();
        double pct = points.isEmpty() ? 100 : round1(100.0 * onTime / points.size());
        return new CtAnalytics.Summary(vehicles.size(), trips, pct);
    }

    @Override
    public CtAnalytics.BusiestHours busiestHours(CtSession session) {
        simulateLatency();
        requireSession(session);
        List<CtAnalytics.BusiestHours.Hour> hours = new ArrayList<>();
        for (int h = 6; h <= 21; h++) {
            hours.add(new CtAnalytics.BusiestHours.Hour(h, round1(demand(h + 0.5) * 38)));
        }
        return new CtAnalytics.BusiestHours(hours);
    }

    @Override
    public CtAnalytics.DelayByRoute delayByRoute(CtSession session, String startTime, String endTime, String routeIds) {
        simulateLatency();
        requireSession(session);
        Set<String> filter = routeIds == null || routeIds.isBlank() ? null : Set.of(routeIds.split(","));
        return new CtAnalytics.DelayByRoute(delaySeries(Instant.now()).stream()
                .filter(p -> filter == null || filter.contains(p.routeId())).toList());
    }

    @Override
    public CtAnalytics.Co2 co2(CtSession session, String startTime, String endTime) {
        simulateLatency();
        requireSession(session);
        double minute = minuteOfDay(Instant.now());
        double passengerKm = 0;
        for (RouteSeed r : routes.values()) {
            double loopKm = loop(r.id()) * BUS_METERS_PER_MINUTE / 1000.0;
            double headway = loop(r.id()) / r.plannedVehicles();
            for (double m = 6 * 60; m < minute; m += headway) {
                passengerKm += demand(m / 60.0) * 38 * 0.55 * loopKm;
            }
        }
        return new CtAnalytics.Co2(round1(passengerKm * (170 - 68) / 1000.0), round1(passengerKm));
    }

    @Override
    public List<CtBus> buses(CtSession session) {
        simulateLatency();
        requireSession(session);
        return List.copyOf(buses);
    }

    @Override
    public CtIncident reportIncident(CtSession session, CtIncidentReport report) {
        simulateLatency();
        requireSession(session);
        Set<String> types = Set.of("ROAD_CLOSED", "PROTEST", "BUS_BREAKDOWN", "ROADWORKS", "ACCIDENT", "OTHER");
        if (report == null || report.type() == null || !types.contains(report.type())) {
            throw new CtApiException(400, "Tipo di incidente non valido");
        }
        if (report.routeId() != null && !routes.containsKey(report.routeId())) {
            throw new CtApiException(400, "Rotta non valida: " + report.routeId());
        }
        Instant now = Instant.now();
        List<String> affectedRoutes = report.routeId() != null ? List.of(report.routeId())
                : routes.values().stream()
                .filter(r -> r.stopIds().stream().map(stops::get).anyMatch(s ->
                        GeoUtils.distanceMeters(s.lat(), s.lon(), report.lat(), report.lon()) <= 300))
                .map(RouteSeed::id).toList();
        List<String> affectedStops = report.stopId() != null && stops.containsKey(report.stopId()) ? List.of(report.stopId())
                : stops.values().stream()
                .filter(s -> GeoUtils.distanceMeters(s.lat(), s.lon(), report.lat(), report.lon()) <= 200)
                .map(StopSeed::id).toList();
        int delay = report.expectedDelayMinutes() == null ? 5 : Math.max(0, Math.min(60, report.expectedDelayMinutes()));
        CtIncident incident = new CtIncident("INC-" + Long.toString(now.toEpochMilli(), 36).toUpperCase(Locale.ROOT),
                report.type(), delay >= 10 ? "HIGH" : "MEDIUM", "Segnalazione " + report.source() + ": " + typeTitle(report.type()).toLowerCase(Locale.ITALY),
                report.description(), affectedRoutes, affectedStops, null, report.lat(), report.lon(), 250, delay,
                "In verifica da parte del fleet manager", report.source(), "UNDER_REVIEW",
                iso(now), iso(now.plus(Duration.ofMinutes(60))));
        reported.add(0, incident);
        LOG.infof("[CassiTrack mock] incident %s reported by %s on routes %s", incident.id(), report.source(), affectedRoutes);
        return incident;
    }

    // ── Simulation ──────────────────────────────────────────────────────

    List<CtIncident> activeIncidents(Instant now) {
        ZonedDateTime hour = now.atZone(ZONE).truncatedTo(ChronoUnit.HOURS);
        List<CtIncident> result = new ArrayList<>();
        StopSeed xxs = stops.get("XXS");
        StopSeed cas = stops.get("CAS");
        StopSeed spa = stops.get("SPA");
        result.add(new CtIncident("INC-2026-0412", "PROTEST", "HIGH", "Manifestazione in Via XX Settembre",
                "Corteo autorizzato: carreggiata chiusa tra Piazza De Gasperi e Via Ausonia.",
                List.of("LINEA_3"), List.of("XXS"), null, xxs.lat(), xxs.lon(), 350, 10,
                "Linea 3 deviata su Corso della Repubblica: fermata Via XX Settembre sospesa, usare Municipio - Piazza De Gasperi.",
                "FLEET_MANAGER", "ACTIVE", iso(hour.minusMinutes(35).toInstant()), iso(hour.plusHours(2).toInstant())));
        result.add(new CtIncident("INC-2026-0413", "BUS_BREAKDOWN", "MEDIUM", "Guasto al mezzo MAGNI-002 (Linea 2)",
                "Guasto segnalato dal conducente in Via Casilina Nord: in arrivo un mezzo sostitutivo.",
                List.of("LINEA_2"), List.of("CAS"), "MAGNI-002", cas.lat(), cas.lon(), 150, 15,
                "Corse della Linea 2 con ritardi fino a 15 minuti. Per il centro valuta la Linea 1 da Corso della Repubblica.",
                "DRIVER", "ACTIVE", iso(hour.minusMinutes(10).toInstant()), iso(hour.plusHours(1).toInstant())));
        result.add(new CtIncident("INC-2026-0409", "ROADWORKS", "LOW", "Lavori in Via San Pasquale",
                "Senso unico alternato per rifacimento del manto stradale.",
                List.of("LINEA_3"), List.of("SPA"), null, spa.lat() + 0.0006, spa.lon() - 0.0004, 250, 4,
                "Rallentamenti in prossimità dell'Ospedale Santa Scolastica.",
                "EXTERNAL", "ACTIVE", iso(hour.minusHours(3).toInstant()), iso(hour.plusHours(6).toInstant())));
        reported.removeIf(i -> OffsetDateTime.parse(i.expectedEndAt()).toInstant().isBefore(now));
        result.addAll(reported);
        return result;
    }

    Snapshot snapshot(VehicleSeed v, Instant now) {
        RouteSeed r = routes.get(v.routeId());
        double[] off = offsets.get(r.id());
        double loop = off[off.length - 1];
        int delay = delayFor(v, now);
        double inLoop = minuteInLoop(v, now, delay);
        int n = r.stopIds().size();
        int i = 0;
        while (i < n - 1 && off[i + 1] <= inLoop) i++;
        StopSeed from = stops.get(r.stopIds().get(i));
        StopSeed to = stops.get(r.stopIds().get((i + 1) % n));
        double lat, lon, speed;
        if (inLoop < off[i] + DWELL_MINUTES) {
            lat = from.lat();
            lon = from.lon();
            speed = 0;
        } else {
            double f = (inLoop - off[i] - DWELL_MINUTES) / (off[i + 1] - off[i] - DWELL_MINUTES);
            lat = from.lat() + (to.lat() - from.lat()) * f;
            lon = from.lon() + (to.lon() - from.lon()) * f;
            speed = round1(14 + 12 * Math.abs(Math.sin(inLoop * 1.7 + v.busId())));
        }
        double heading = Math.round((Math.toDegrees(Math.atan2(
                (to.lon() - from.lon()) * Math.cos(Math.toRadians(from.lat())), to.lat() - from.lat())) + 360) % 360);
        double hour = minuteOfDay(now) / 60.0;
        double load = demand(hour) * (r.id().equals("LINEA_1") ? 1.25 : r.id().equals("LINEA_2") ? 0.9 : 1.0)
                * (1 + 0.12 * Math.sin(inLoop / loop * 2 * Math.PI + v.busId()))
                + Math.min(0.3, delay / 50.0);
        int occ = (int) Math.round(load * v.seats() / 0.6);
        int passengers = (int) Math.round(occ * 0.6);
        return new Snapshot(v, lat, lon, speed, heading, delay, (i + 1) % n, off[i + 1] - inLoop, inLoop, passengers,
                crowding(passengers, v.seats()));
    }

    /** Live passes of every tracked vehicle at the stop within the window. */
    List<Pass> livePasses(String stopId, Instant from, Instant to) {
        List<Pass> passes = new ArrayList<>();
        for (VehicleSeed v : vehicles) {
            RouteSeed r = routes.get(v.routeId());
            int idx = r.stopIds().indexOf(stopId);
            if (idx < 0) continue;
            Snapshot s = snapshot(v, from);
            double loop = loop(r.id());
            double dt = mod(offsets.get(r.id())[idx] - s.minuteInLoop(), loop);
            for (double m = dt; from.plusSeconds((long) (m * 60)).isBefore(to); m += loop) {
                Instant eta = from.plusSeconds((long) (m * 60)).truncatedTo(ChronoUnit.SECONDS);
                passes.add(new Pass(r.id(), v.vehicleId(), eta, eta.minus(Duration.ofMinutes(s.delayMinutes())),
                        s.delayMinutes(), s.crowding(), true));
            }
        }
        passes.sort(Comparator.comparing(Pass::estimated));
        return passes;
    }

    /** Timetable passes at the stop within the window; {@code untrackedOnly} keeps the slots without an OBU vehicle. */
    List<Pass> scheduledPasses(String stopId, Instant from, Instant to, boolean untrackedOnly) {
        List<Pass> passes = new ArrayList<>();
        ZonedDateTime midnight = from.atZone(ZONE).truncatedTo(ChronoUnit.DAYS);
        double fromMinute = minuteOfDay(from);
        for (RouteSeed r : routes.values()) {
            int idx = r.stopIds().indexOf(stopId);
            if (idx < 0) continue;
            double loop = loop(r.id());
            for (int slot = 0; slot < r.plannedVehicles(); slot++) {
                int s = slot;
                if (untrackedOnly && vehicles.stream().anyMatch(v -> v.routeId().equals(r.id()) && v.slot() == s)) continue;
                double first = offsets.get(r.id())[idx] + slot * loop / r.plannedVehicles();
                double m = first + Math.ceil((fromMinute - first) / loop) * loop;
                for (; ; m += loop) {
                    Instant at = midnight.plusSeconds((long) (m * 60)).toInstant().truncatedTo(ChronoUnit.SECONDS);
                    if (at.isAfter(to)) break;
                    passes.add(new Pass(r.id(), null, at, at, 0, null, false));
                }
            }
        }
        passes.sort(Comparator.comparing(Pass::estimated));
        return passes;
    }

    CtStopArrival toArrival(Pass p, String stopId) {
        RouteSeed r = routes.get(p.routeId());
        return new CtStopArrival(tripId(p, stopId), p.vehicleId(), r.id(), r.shortName() + " - " + r.longName(),
                iso(p.scheduled()), iso(p.estimated()), p.delayMinutes(), p.crowding(),
                p.realtime() ? scheduleStatus(p.delayMinutes()) : "SCHEDULED", p.realtime());
    }

    /** Trip id = route + scheduled departure from the first stop, in seconds of the day (e.g. LINEA_1_28800). */
    String tripId(Pass p, String stopId) {
        RouteSeed r = routes.get(p.routeId());
        double startMinute = minuteOfDay(p.scheduled()) - offsets.get(r.id())[r.stopIds().indexOf(stopId)];
        long seconds = Math.round(mod(startMinute, 24 * 60)) * 60;
        return r.id() + "_" + seconds;
    }

    private int delayFor(VehicleSeed v, Instant now) {
        int incidentDelay = 0;
        for (CtIncident i : activeIncidents(now)) {
            if (!"ACTIVE".equals(i.status())) continue;
            if (v.vehicleId().equals(i.vehicleId()) || (i.vehicleId() == null && i.routeIds().contains(v.routeId()))) {
                incidentDelay = Math.max(incidentDelay, i.expectedDelayMinutes());
            }
        }
        return v.baseDelay() + incidentDelay;
    }

    private double minuteInLoop(VehicleSeed v, Instant now, int delay) {
        RouteSeed r = routes.get(v.routeId());
        double loop = loop(r.id());
        return mod(minuteOfDay(now) - delay - v.slot() * loop / r.plannedVehicles(), loop);
    }

    private List<CtAnalytics.DelayByRoute.Point> delaySeries(Instant now) {
        int currentHour = now.atZone(ZONE).getHour();
        List<CtAnalytics.DelayByRoute.Point> points = new ArrayList<>();
        List<CtIncident> incidents = activeIncidents(now);
        for (RouteSeed r : routes.values()) {
            double base = switch (r.id()) {
                case "LINEA_1" -> 0.8;
                case "LINEA_2" -> 1.6;
                default -> 1.2;
            };
            for (int h = 6; h <= Math.min(21, currentHour); h++) {
                double value = base + 2.4 * gauss(h, 8, 1.0) + 2.0 * gauss(h, 18, 1.2);
                for (CtIncident i : incidents) {
                    int startHour = OffsetDateTime.parse(i.reportedAt()).atZoneSameInstant(ZONE).getHour();
                    if (i.routeIds().contains(r.id()) && h >= startHour) value += i.expectedDelayMinutes() * 0.7;
                }
                points.add(new CtAnalytics.DelayByRoute.Point(r.id(), String.format("%02d:00", h), round1(value)));
            }
        }
        return points;
    }

    // Accessors used by MockOmniMoveClient (the bean is injected through a client proxy: no direct field access)

    Map<String, StopSeed> stopSeeds() {
        return stops;
    }

    Map<String, RouteSeed> routeSeeds() {
        return routes;
    }

    double loop(String routeId) {
        double[] off = offsets.get(routeId);
        return off[off.length - 1];
    }

    double offset(String routeId, int stopIndex) {
        return offsets.get(routeId)[stopIndex];
    }

    boolean accessible(String vehicleId) {
        return vehicles.stream().anyMatch(v -> v.vehicleId().equals(vehicleId) && v.accessible());
    }

    /** Relative demand of the TPL network by hour of day (morning school/work peak, lunch, evening peak). */
    static double demand(double hour) {
        return 0.18 + 0.55 * gauss(hour, 7.75, 1.0) + 0.3 * gauss(hour, 13.5, 1.0) + 0.45 * gauss(hour, 17.75, 1.3);
    }

    static String crowding(int passengers, int seats) {
        double ratio = (double) passengers / seats;
        if (ratio < 0.35) return "LOW";
        if (ratio < 0.65) return "MEDIUM";
        if (ratio < 0.9) return "HIGH";
        return "VERY_HIGH";
    }

    static String scheduleStatus(int delay) {
        if (delay < -1) return "EARLY";
        if (delay <= 2) return "ON_TIME";
        if (delay <= 7) return "SLIGHT_DELAY";
        return "LATE";
    }

    private static String typeTitle(String type) {
        return switch (type) {
            case "ROAD_CLOSED" -> "Strada chiusa";
            case "PROTEST" -> "Manifestazione";
            case "BUS_BREAKDOWN" -> "Guasto al mezzo";
            case "ROADWORKS" -> "Lavori stradali";
            case "ACCIDENT" -> "Incidente stradale";
            default -> "Problema sul percorso";
        };
    }

    static double minuteOfDay(Instant t) {
        ZonedDateTime z = t.atZone(ZONE);
        return z.getHour() * 60 + z.getMinute() + z.getSecond() / 60.0;
    }

    private static double gauss(double x, double mu, double sigma) {
        return Math.exp(-((x - mu) * (x - mu)) / (2 * sigma * sigma));
    }

    private static double mod(double a, double m) {
        double r = a % m;
        return r < 0 ? r + m : r;
    }

    static String iso(Instant t) {
        return t.truncatedTo(ChronoUnit.SECONDS).atZone(ZONE).toOffsetDateTime().toString();
    }

    static double round1(double v) {
        return Math.round(v * 10) / 10.0;
    }

    private static double round5(double v) {
        return Math.round(v * 100000) / 100000.0;
    }

    private void simulateLatency() {
        try {
            Thread.sleep(5 + random.nextInt(25));
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
        }
    }
}
