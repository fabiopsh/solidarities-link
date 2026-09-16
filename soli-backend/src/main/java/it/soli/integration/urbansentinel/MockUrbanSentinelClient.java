package it.soli.integration.urbansentinel;

import it.soli.integration.faro.GeoUtils;
import it.soli.integration.urbansentinel.dto.*;
import jakarta.annotation.PostConstruct;
import jakarta.enterprise.context.ApplicationScoped;
import org.jboss.logging.Logger;

import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.time.*;
import java.time.format.DateTimeParseException;
import java.util.*;

/**
 * In-memory simulation of the Urban Sentinel REST API.
 *
 * Seeds a realistic post-event scenario: INGV events (Campi Flegrei, Colli Albani and the
 * Pizzone event from the partner's sample call), public buildings instrumented with MEMS sensors,
 * and the KPIs the Seismic Event Analysis Engine would compute for each sensor: peak accelerations
 * on X/Y/Z, resultant peak, event and pre/post alert level. Alert thresholds are internal to
 * Urban Sentinel and are not exposed by its API: the mock only uses them to derive the alert levels.
 * Accelerations come from a simple attenuation model (magnitude, hypocentral distance, structure
 * type, sensor floor), so values stay coherent with the map.
 */
@ApplicationScoped
public class MockUrbanSentinelClient implements UrbanSentinelClient {

    private static final Logger LOG = Logger.getLogger(MockUrbanSentinelClient.class);

    static final String USERNAME = "soli-integration";
    static final String PASSWORD = "soli-us-demo";

    private static final long TOKEN_TTL_SECONDS = 900;
    private static final double ANALYSIS_RADIUS_KM = 80;
    private static final double YELLOW_RATIO = 0.6;

    public static final List<String> METRIC_NAMES = List.of(
            "distance_km", "peak_acc_x", "peak_acc_y", "peak_acc_z", "peak_resultant",
            "event_alert_level", "pre_post_alert_level");

    private final SecureRandom random = new SecureRandom();
    private final Map<String, Instant> tokens = new HashMap<>();
    private final List<UsEarthquake> earthquakes = new ArrayList<>();
    private final List<UsBuilding> buildings = new ArrayList<>();
    private final List<UsSeismicMetrics.Metric> metrics = new ArrayList<>();
    // Internal alert thresholds (mg) per building: never returned by the API
    private final Map<String, Double> thresholds = new HashMap<>();

    private record BuildingSeed(String name, String type, String address, String city, double lat, double lon,
                                int year, String structure, int floors, int occupants, double threshold, int sensors) {
    }

    @PostConstruct
    void seed() {
        ZonedDateTime today = LocalDate.now(ZoneOffset.UTC).atStartOfDay(ZoneOffset.UTC);

        earthquakes.add(new UsEarthquake(2.9,
                new UsEarthquake.GeoInfo("Pozzuoli", "Italy", "it", "Via Solfatara, 80078 Pozzuoli NA, Italy", "80078", "Napoli", "Campania", "Solfatara"),
                "3f1b9c2e-7a41-4c0e-9b5d-0e2f6c8a4d17", 40.8270, 14.1390, 4.4,
                iso(today.minusDays(2).plusHours(3).plusMinutes(50).plusSeconds(52))));
        earthquakes.add(new UsEarthquake(8.2,
                new UsEarthquake.GeoInfo("Marino", "Italy", "it", "Via dei Laghi, 00047 Marino RM, Italy", "00047", "Roma", "Lazio", "Frattocchie"),
                "b7d4e0a9-52c3-4f18-8e6a-19c0d3f7a2b5", 41.7660, 12.6280, 3.9,
                iso(today.minusDays(5).plusHours(14).plusMinutes(21).plusSeconds(7))));
        earthquakes.add(new UsEarthquake(2.4,
                new UsEarthquake.GeoInfo("Pozzuoli", "Italy", "it", "Via Pisciarelli, 80078 Pozzuoli NA, Italy", "80078", "Napoli", "Campania", "Pisciarelli"),
                "9a6c2d71-0e5b-4b3a-a4f2-6d8e1c5b7f30", 40.8290, 14.1450, 3.8,
                iso(today.minusDays(9).plusHours(22).plusMinutes(4).plusSeconds(39))));
        // Event returned by the partner's sample call (GET /earthquakes, July 2026)
        earthquakes.add(new UsEarthquake(10.3,
                new UsEarthquake.GeoInfo("Pizzone", "Italy", "it", "Via Le Forme, 74, 86071 Pizzone IS, Italy", "86071", "Isernia", "Molise", null),
                "e63c71c5-9921-4512-95d9-24e9b662b232", 41.6728, 14.0158, 4.1, "2026-07-24T22:08:13+00:00"));

        List<BuildingSeed> seeds = List.of(
                // Campi Flegrei
                new BuildingSeed("I.C. Pergolesi - Plesso Falcone", "SCHOOL", "Via Campi Flegrei 21", "Pozzuoli", 40.8338, 14.1181, 1968, "REINFORCED_CONCRETE", 3, 540, 208, 5),
                new BuildingSeed("Municipio di Pozzuoli", "TOWN_HALL", "Via Tito Livio 4", "Pozzuoli", 40.8236, 14.1221, 1921, "MASONRY", 3, 180, 180, 3),
                new BuildingSeed("Liceo Scientifico E. Majorana", "SCHOOL", "Via Fasano 1", "Pozzuoli", 40.8431, 14.1312, 1975, "REINFORCED_CONCRETE", 4, 910, 220, 4),
                new BuildingSeed("Palazzetto dello Sport \"G. Stefanelli\"", "SPORTS_HALL", "Via Vecchia delle Vigne", "Pozzuoli", 40.8295, 14.1428, 1991, "STEEL", 2, 1200, 230, 2),
                new BuildingSeed("Ospedale S. Maria delle Grazie", "HOSPITAL", "Via Domitiana, loc. La Schiana", "Pozzuoli", 40.8566, 14.0930, 2004, "REINFORCED_CONCRETE", 5, 650, 250, 6),
                new BuildingSeed("I.C. Rodari-Annecchino", "SCHOOL", "Via Pietro Nenni 1, Arco Felice", "Pozzuoli", 40.8395, 14.0905, 1958, "MASONRY", 2, 420, 170, 3),
                new BuildingSeed("Municipio di Bacoli", "TOWN_HALL", "Via Lungolago 8", "Bacoli", 40.7975, 14.0780, 1932, "MASONRY", 2, 90, 175, 2),
                new BuildingSeed("Scuola Primaria Bagnoli - Plesso Russolillo", "SCHOOL", "Via Enea 21", "Napoli", 40.8125, 14.1650, 1972, "REINFORCED_CONCRETE", 3, 380, 200, 3),
                // Colli Albani / Roma
                new BuildingSeed("Municipio di Marino", "TOWN_HALL", "Largo Palazzo Colonna 1", "Marino", 41.7703, 12.6601, 1850, "MASONRY", 3, 160, 170, 3),
                new BuildingSeed("I.C. Leonardo da Vinci", "SCHOOL", "Via Mura dei Francesi 150", "Ciampino", 41.8012, 12.6007, 1978, "REINFORCED_CONCRETE", 3, 700, 210, 3),
                new BuildingSeed("Liceo Classico Ugo Foscolo", "SCHOOL", "Via S. Francesco d'Assisi 34", "Albano Laziale", 41.7310, 12.6600, 1935, "MASONRY", 3, 850, 180, 3),
                new BuildingSeed("I.C. Via Tuscolana 208", "SCHOOL", "Via Tuscolana 208", "Roma", 41.8725, 12.5452, 1965, "REINFORCED_CONCRETE", 4, 620, 205, 4),
                new BuildingSeed("Municipio VII Roma Capitale", "TOWN_HALL", "Piazza di Cinecittà 11", "Roma", 41.8545, 12.5680, 1960, "REINFORCED_CONCRETE", 5, 300, 210, 3),
                new BuildingSeed("Scuola Primaria Plesso Mazzini", "SCHOOL", "Piazza Marconi 5", "Frascati", 41.8075, 12.6795, 1910, "MASONRY", 2, 260, 165, 2),
                new BuildingSeed("Istituto Tecnico G. Galilei", "SCHOOL", "Via Conte Verde 51", "Roma", 41.8955, 12.5070, 1962, "REINFORCED_CONCRETE", 4, 980, 210, 3),
                // Alto Molise
                new BuildingSeed("Municipio di Pizzone", "TOWN_HALL", "Piazza Municipio 1", "Pizzone", 41.6739, 14.0376, 1900, "MASONRY", 2, 30, 160, 2),
                new BuildingSeed("Scuola dell'Infanzia Castel San Vincenzo", "SCHOOL", "Via Roma 12", "Castel San Vincenzo", 41.6555, 14.0620, 1961, "MASONRY", 1, 45, 170, 2),
                new BuildingSeed("Liceo Classico O. Fascitelli", "SCHOOL", "Via Giuseppe Berta 1", "Isernia", 41.5940, 14.2330, 1970, "REINFORCED_CONCRETE", 3, 640, 210, 3),
                new BuildingSeed("Municipio di Alfedena", "TOWN_HALL", "Piazza Umberto I", "Alfedena", 41.7350, 14.0340, 1895, "MASONRY", 2, 25, 165, 2));

        for (BuildingSeed s : seeds) {
            String buildingId = uuid("building:" + s.name());
            List<UsBuilding.Sensor> sensors = new ArrayList<>();
            for (int i = 1; i <= s.sensors(); i++) {
                int floor = Math.min(s.floors(), (int) Math.round((double) (i - 1) * s.floors() / Math.max(1, s.sensors() - 1)));
                sensors.add(new UsBuilding.Sensor(uuid("sensor:" + s.name() + ":" + i), "sensor-" + i, floor));
            }
            buildings.add(new UsBuilding(buildingId, s.name(), s.type(), s.address(), s.city(), s.lat(), s.lon(), s.year(),
                    s.structure(), s.floors(), s.occupants(), "NORMALE", sensors));
            thresholds.put(buildingId, s.threshold());
        }

        for (UsEarthquake eq : earthquakes) {
            ZonedDateTime computedAt = OffsetDateTime.parse(eq.occurredAt()).toZonedDateTime().plusMinutes(4);
            for (UsBuilding b : buildings) {
                double epicentral = GeoUtils.distanceMeters(eq.latitude(), eq.longitude(), b.latitude(), b.longitude()) / 1000.0;
                if (epicentral > ANALYSIS_RADIUS_KM) continue;
                for (UsBuilding.Sensor sensor : b.sensors()) {
                    metrics.add(computeMetric(eq, b, sensor, epicentral, iso(computedAt)));
                }
            }
        }

        // Building health = worst event alert level over the last 30 days
        Instant recent = Instant.now().minus(Duration.ofDays(30));
        for (int i = 0; i < buildings.size(); i++) {
            UsBuilding b = buildings.get(i);
            String worst = metrics.stream()
                    .filter(m -> m.buildingId().equals(b.id()))
                    .filter(m -> OffsetDateTime.parse(m.computedAt()).toInstant().isAfter(recent))
                    .map(UsSeismicMetrics.Metric::eventAlertLevel)
                    .max(Comparator.comparingInt(MockUrbanSentinelClient::severity)).orElse("GREEN");
            String health = switch (worst) {
                case "RED" -> "CRITICO";
                case "YELLOW" -> "ATTENZIONE";
                default -> "NORMALE";
            };
            buildings.set(i, new UsBuilding(b.id(), b.name(), b.buildingType(), b.address(), b.city(), b.latitude(), b.longitude(),
                    b.constructionYear(), b.structureType(), b.floors(), b.occupants(), health, b.sensors()));
        }

        LOG.infof("[Urban Sentinel mock] ready: %d earthquakes, %d buildings, %d sensor KPIs",
                earthquakes.size(), buildings.size(), metrics.size());
    }

    private UsSeismicMetrics.Metric computeMetric(UsEarthquake eq, UsBuilding b, UsBuilding.Sensor sensor,
                                                  double epicentralKm, String computedAt) {
        double hypocentral = Math.sqrt(epicentralKm * epicentralKm + eq.depth() * eq.depth());
        double structure = switch (b.structureType()) {
            case "MASONRY" -> 1.35;
            case "STEEL" -> 0.9;
            default -> 1.0;
        };
        double floorAmplification = 0.85 + 0.12 * sensor.floor();
        double jitter = 0.92 + 0.16 * unit(sensor.id() + eq.id());
        double resultant = 10 * Math.pow(10, 0.5 * eq.magnitude()) / Math.pow(hypocentral + 1, 1.6)
                * structure * floorAmplification * jitter;

        // Split on the three axes (horizontal components dominate), then recompute the resultant
        double wx = 0.70 + 0.25 * unit("x" + sensor.id() + eq.id());
        double wy = 0.45 + 0.30 * unit("y" + sensor.id() + eq.id());
        double wz = 0.25 + 0.20 * unit("z" + sensor.id() + eq.id());
        double norm = Math.sqrt(wx * wx + wy * wy + wz * wz);
        double x = round2(resultant * wx / norm);
        double y = round2(resultant * wy / norm);
        double z = round2(resultant * wz / norm);
        double peak = round2(Math.sqrt(x * x + y * y + z * z));

        double ratio = peak / thresholds.get(b.id());
        String eventLevel = ratio >= 1 ? "RED" : ratio >= YELLOW_RATIO ? "YELLOW" : "GREEN";
        String prePost = switch (eventLevel) {
            case "RED" -> unit("pp" + sensor.id() + eq.id()) < 0.5 ? "RED" : "YELLOW";
            case "YELLOW" -> unit("pp" + sensor.id() + eq.id()) < 0.35 ? "YELLOW" : "GREEN";
            default -> "GREEN";
        };
        return new UsSeismicMetrics.Metric(eq.id(), b.id(), sensor.id(), sensor.name(), computedAt,
                round2(epicentralKm), x, y, z, peak,
                eventLevel, prePost);
    }

    // ── API ─────────────────────────────────────────────────────────────

    @Override
    public synchronized LoginResult login(UsLoginRequest credentials) {
        simulateLatency();
        if (credentials == null || isBlank(credentials.username()) || isBlank(credentials.password())) {
            throw new UsApiException(400, "Credenziali mancanti");
        }
        if (!USERNAME.equals(credentials.username()) || !PASSWORD.equals(credentials.password())) {
            throw new UsApiException(401, "Credenziali non valide");
        }
        String token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9." + randomToken(32);
        tokens.put(token, Instant.now().plusSeconds(TOKEN_TTL_SECONDS));
        UsLoginResponse body = new UsLoginResponse(token, "Bearer", TOKEN_TTL_SECONDS,
                new UsLoginResponse.UsUser(uuid("user:" + USERNAME), USERNAME, "USER", buildings.size()));
        return new LoginResult(body, randomToken(40));
    }

    @Override
    public synchronized List<UsEarthquake> earthquakes(UsSession session, Double minMagnitude, String from, String to) {
        simulateLatency();
        requireSession(session);
        Instant fromInstant = parseInstant(from, "from");
        Instant toInstant = parseInstant(to, "to");
        return earthquakes.stream()
                .filter(e -> minMagnitude == null || e.magnitude() >= minMagnitude)
                .filter(e -> fromInstant == null || !OffsetDateTime.parse(e.occurredAt()).toInstant().isBefore(fromInstant))
                .filter(e -> toInstant == null || !OffsetDateTime.parse(e.occurredAt()).toInstant().isAfter(toInstant))
                .sorted(Comparator.comparing((UsEarthquake e) -> OffsetDateTime.parse(e.occurredAt()).toInstant()).reversed())
                .toList();
    }

    @Override
    public synchronized List<UsBuilding> buildings(UsSession session, String name, Double minLatitude, Double maxLatitude,
                                                   Double minLongitude, Double maxLongitude) {
        simulateLatency();
        requireSession(session);
        if ((minLatitude != null && maxLatitude != null && minLatitude > maxLatitude)
                || (minLongitude != null && maxLongitude != null && minLongitude > maxLongitude)) {
            throw new UsApiException(400, "Filtro geografico non valido: limite minimo maggiore del massimo");
        }
        String needle = name == null ? null : name.toLowerCase(Locale.ROOT);
        return buildings.stream()
                .filter(b -> needle == null || b.name().toLowerCase(Locale.ROOT).contains(needle))
                .filter(b -> minLatitude == null || b.latitude() >= minLatitude)
                .filter(b -> maxLatitude == null || b.latitude() <= maxLatitude)
                .filter(b -> minLongitude == null || b.longitude() >= minLongitude)
                .filter(b -> maxLongitude == null || b.longitude() <= maxLongitude)
                .toList();
    }

    @Override
    public synchronized UsSeismicMetrics seismicMetrics(UsSession session, String idEvent, String sensorId, String buildingId,
                                                        String startDate, String endDate, String selectMetrics) {
        simulateLatency();
        requireSession(session);
        Set<String> selected = null;
        if (selectMetrics != null && !selectMetrics.isBlank()) {
            selected = new HashSet<>();
            for (String raw : selectMetrics.split(",")) {
                String metric = raw.trim();
                if (!METRIC_NAMES.contains(metric)) {
                    throw new UsApiException(400, "Metrica non valida in select_metrics: " + metric);
                }
                selected.add(metric);
            }
        }
        Instant start = parseInstant(startDate, "start_date");
        Instant end = parseInstant(endDate, "end_date");

        List<UsSeismicMetrics.Metric> result = new ArrayList<>();
        for (UsSeismicMetrics.Metric m : metrics) {
            if (idEvent != null && !idEvent.equals(m.idEvent())) continue;
            if (sensorId != null && !sensorId.equals(m.sensorId())) continue;
            if (buildingId != null && !buildingId.equals(m.buildingId())) continue;
            Instant at = OffsetDateTime.parse(m.computedAt()).toInstant();
            if (start != null && at.isBefore(start)) continue;
            if (end != null && at.isAfter(end)) continue;
            result.add(select(m, selected));
        }
        Set<String> eventIds = new HashSet<>();
        result.forEach(m -> eventIds.add(m.idEvent()));
        List<UsEarthquake> events = earthquakes.stream().filter(e -> eventIds.contains(e.id())).toList();
        return new UsSeismicMetrics(result.size(), events, result);
    }

    // ── Internals ───────────────────────────────────────────────────────

    private static UsSeismicMetrics.Metric select(UsSeismicMetrics.Metric m, Set<String> s) {
        if (s == null) return m;
        return new UsSeismicMetrics.Metric(m.idEvent(), m.buildingId(), m.sensorId(), m.sensorName(), m.computedAt(),
                s.contains("distance_km") ? m.distanceKm() : null,
                s.contains("peak_acc_x") ? m.peakAccX() : null,
                s.contains("peak_acc_y") ? m.peakAccY() : null,
                s.contains("peak_acc_z") ? m.peakAccZ() : null,
                s.contains("peak_resultant") ? m.peakResultant() : null,
                s.contains("event_alert_level") ? m.eventAlertLevel() : null,
                s.contains("pre_post_alert_level") ? m.prePostAlertLevel() : null);
    }

    static int severity(String level) {
        return switch (level == null ? "" : level) {
            case "RED" -> 2;
            case "YELLOW" -> 1;
            default -> 0;
        };
    }

    private void requireSession(UsSession session) {
        Instant expiry = session == null ? null : tokens.get(session.accessToken());
        if (expiry == null || expiry.isBefore(Instant.now()) || isBlank(session.refreshCookie())) {
            throw new UsApiException(401, "Token mancante, scaduto o non valido");
        }
    }

    private static Instant parseInstant(String value, String field) {
        if (value == null || value.isBlank()) return null;
        try {
            return OffsetDateTime.parse(value).toInstant();
        } catch (DateTimeParseException e) {
            throw new UsApiException(400, "Formato data non valido per " + field + " (atteso ISO-8601)");
        }
    }

    /** Deterministic value in [0,1) derived from a key, so KPIs are stable across restarts. */
    private static double unit(String key) {
        return (UUID.nameUUIDFromBytes(key.getBytes(StandardCharsets.UTF_8)).getLeastSignificantBits() >>> 11) / (double) (1L << 53);
    }

    private static String uuid(String key) {
        return UUID.nameUUIDFromBytes(key.getBytes(StandardCharsets.UTF_8)).toString();
    }

    private static String iso(ZonedDateTime t) {
        return t.toOffsetDateTime().toString().replace("Z", "+00:00");
    }

    private static double round2(double v) {
        return Math.round(v * 100) / 100.0;
    }

    private String randomToken(int bytes) {
        byte[] raw = new byte[bytes];
        random.nextBytes(raw);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(raw);
    }

    private void simulateLatency() {
        try {
            Thread.sleep(30 + random.nextInt(120));
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
        }
    }

    private static boolean isBlank(String s) {
        return s == null || s.isBlank();
    }
}
