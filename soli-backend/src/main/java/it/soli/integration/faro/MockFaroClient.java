package it.soli.integration.faro;

import it.soli.integration.faro.dto.*;
import jakarta.annotation.PostConstruct;
import jakarta.enterprise.context.ApplicationScoped;
import org.jboss.logging.Logger;

import java.security.SecureRandom;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicLong;

/**
 * In-memory simulation of the FARO APIs consumed by SOLI.
 *
 * Behaviour follows FARO's functional document: status codes (201/202/400/401/404),
 * payload shapes, verified-reporter confidence (0.8) against the publication threshold,
 * service registry with heartbeat expiry, emergency state machine OPEN -> IN_PROGRESS -> CLOSED,
 * and a "Stream eventi" topic that keeps republishing re-evaluations of active incidents.
 * State is lost on restart, like a fresh FARO sandbox.
 */
@ApplicationScoped
public class MockFaroClient implements FaroClient {

    private static final Logger LOG = Logger.getLogger(MockFaroClient.class);

    public static final Set<String> CATEGORIES = Set.of("FIRE", "FLOOD", "CAR_CRASH", "HEALTH_CRISIS", "UNKNOWN");
    public static final List<String> SEVERITIES = List.of("LOW", "MEDIUM", "HIGH", "CRITICAL");
    private static final Set<String> SERVICE_TYPES = Set.of("FIRE_STATION", "HOSPITAL", "POLICE", "CIVIC_VOLUNTEERING");
    private static final Set<String> SERVICE_STATUSES = Set.of("UP", "DOWN", "BUSY");

    private static final double VERIFIED_REPORTER_CONFIDENCE = 0.8;
    private static final double ANONYMOUS_REPORTER_CONFIDENCE = 0.2;
    private static final double PUBLICATION_THRESHOLD = 0.6;
    private static final long HEARTBEAT_EXPIRY_SECONDS = 300;
    private static final long REPUBLISH_EVERY_SECONDS = 30;
    private static final long OPEN_TO_IN_PROGRESS_SECONDS = 20;
    private static final long REPORT_CORRELATION_DELAY_SECONDS = 4;
    private static final double REPORT_CORRELATION_RADIUS_METERS = 400;
    private static final int STREAM_RETENTION = 2000;

    private final SecureRandom random = new SecureRandom();
    private final AtomicLong userIds = new AtomicLong(100);
    private final AtomicLong capabilityIds = new AtomicLong(10);
    private final AtomicLong serviceIds = new AtomicLong(20);
    private final AtomicLong emergencyIds = new AtomicLong(40);

    private final Map<String, MockUser> users = new HashMap<>();
    private final Set<String> tokens = new HashSet<>();
    private final Map<String, FaroCapability> capabilities = new LinkedHashMap<>();
    private final Map<Long, MockService> services = new LinkedHashMap<>();
    private final Map<Long, MockEmergency> emergencies = new LinkedHashMap<>();
    private final List<FaroStreamEvent> stream = new ArrayList<>();
    private final Map<String, Integer> consumerOffsets = new HashMap<>();

    // ── Seed: a FARO sandbox already running in the seed cities (Pisa, Milano, Roma) ──
    @PostConstruct
    void seed() {
        for (String name : List.of("FireSuppression", "MedicalAssistance", "TrafficControl", "Evacuation")) {
            long id = capabilityIds.incrementAndGet();
            capabilities.put(name, new FaroCapability(id, name));
        }

        seedService("Comando Provinciale VVF Pisa", "http://vvf-pisa.faro.local/engage", "FIRE_STATION", 43.7160, 10.4110, List.of("FireSuppression"));
        seedService("AOU Pisana - Cisanello", "http://aou-pisana.faro.local/engage", "HOSPITAL", 43.7056, 10.4280, List.of("MedicalAssistance"));
        seedService("Comando Provinciale VVF Milano", "http://vvf-milano.faro.local/engage", "FIRE_STATION", 45.4700, 9.1650, List.of("FireSuppression"));
        seedService("Questura di Roma", "http://questura-roma.faro.local/engage", "POLICE", 41.9000, 12.5000, List.of("TrafficControl"));
        seedService("Misericordia - Gruppo Volontari", "http://misericordia.faro.local/engage", "CIVIC_VOLUNTEERING", 43.7190, 10.4010, List.of("ElderlyAssistance", "LogisticSupport"));

        seedEmergency("FIRE", "HIGH", 43.7085, 10.3765, "Via Livornese 112, Pisa", 0.87, true, false, false, 35);
        seedEmergency("FLOOD", "MEDIUM", 43.7167, 10.3990, "Lungarno Pacinotti 40, Pisa", 0.78, false, false, false, 50);
        seedEmergency("HEALTH_CRISIS", "HIGH", 45.4780, 9.2105, "Corso Buenos Aires 54, Milano", 0.82, true, true, false, 12);
        seedEmergency("CAR_CRASH", "MEDIUM", 45.4935, 9.2230, "Viale Monza 140, Milano", 0.74, true, false, false, 25);
        seedEmergency("FIRE", "CRITICAL", 45.4420, 9.2010, "Via Ripamonti 88, Milano", 0.93, true, false, true, 18);
        seedEmergency("FLOOD", "HIGH", 41.8700, 12.4800, "Via Ostiense 201, Roma", 0.85, false, false, true, 40);
        seedEmergency("FIRE", "CRITICAL", 41.8950, 12.5450, "Via Prenestina 310, Roma", 0.91, true, true, false, 8);
        seedEmergency("HEALTH_CRISIS", "MEDIUM", 41.9010, 12.4930, "Via Nazionale 75, Roma", 0.71, true, false, false, 30);

        LOG.infof("[FARO mock] sandbox ready: %d capabilities, %d services, %d emergencies",
                capabilities.size(), services.size(), emergencies.size());
    }

    private void seedService(String name, String endpoint, String type, double lat, double lon, List<String> caps) {
        for (String cap : caps) {
            capabilities.computeIfAbsent(cap, c -> new FaroCapability(capabilityIds.incrementAndGet(), c));
        }
        MockService s = new MockService();
        s.id = serviceIds.incrementAndGet();
        s.name = name;
        s.endpoint = endpoint;
        s.type = type;
        s.status = "UP";
        // The other volunteering group advertises low load, so the Binder tries it first and falls back on 503
        boolean volunteering = "CIVIC_VOLUNTEERING".equals(type);
        s.avgLatency = volunteering ? 20.0 : 40.0 + random.nextInt(80);
        s.currentLoad = volunteering ? 0.05 : Math.round(random.nextDouble() * 60) / 100.0;
        s.latitude = lat;
        s.longitude = lon;
        s.capabilities = new ArrayList<>(caps);
        s.simulatedPeer = true;
        s.lastContact = Instant.now();
        services.put(s.id, s);
    }

    private void seedEmergency(String category, String severity, double lat, double lon, String address,
                               double confidence, boolean injured, boolean unconscious, boolean trapped, int minutesAgo) {
        MockEmergency e = newEmergency(category, severity, lat, lon, address, confidence, injured, unconscious, trapped);
        e.createdAt = Instant.now().minusSeconds(minutesAgo * 60L);
        advance(e);
        publish(e);
    }

    // ── Users & sessions ────────────────────────────────────────────────

    @Override
    public synchronized FaroUser registerUser(FaroCredentials credentials) {
        simulateLatency();
        if (credentials == null || isBlank(credentials.username()) || isBlank(credentials.password())) {
            throw new FaroApiException(400, "username e password sono obbligatori");
        }
        if (users.containsKey(credentials.username())) {
            throw new FaroApiException(400, "username già registrato");
        }
        MockUser u = new MockUser(userIds.incrementAndGet(), credentials.username(), credentials.password());
        users.put(u.username, u);
        return new FaroUser(u.id, u.username);
    }

    @Override
    public synchronized FaroSession login(long userId, FaroCredentials credentials) {
        simulateLatency();
        MockUser u = credentials == null ? null : users.get(credentials.username());
        if (u == null || u.id != userId || !u.password.equals(credentials.password())) {
            throw new FaroApiException(401, "Credenziali non valide");
        }
        byte[] raw = new byte[24];
        random.nextBytes(raw);
        String token = "eyJhbGciOiJIUzI1NiJ9.faro." + Base64.getUrlEncoder().withoutPadding().encodeToString(raw);
        tokens.add(token);
        return new FaroSession(token, "Bearer", 3600);
    }

    // ── Reports ─────────────────────────────────────────────────────────

    @Override
    public synchronized int sendReport(String bearerToken, FaroReportRequest report) {
        simulateLatency();
        // FARO's API Gateway downgrades invalid/missing tokens to anonymous reports instead of rejecting them
        boolean verified = bearerToken != null && tokens.contains(bearerToken);
        if (report == null || report.emergencyCategory() == null || !CATEGORIES.contains(report.emergencyCategory())) {
            throw new FaroApiException(400, "emergencyCategory non valida");
        }
        if (report.latitude() == null || report.longitude() == null || isBlank(report.address()) || isBlank(report.timestamp())) {
            throw new FaroApiException(400, "latitude, longitude, address e timestamp sono obbligatori");
        }
        double confidence = verified ? VERIFIED_REPORTER_CONFIDENCE : ANONYMOUS_REPORTER_CONFIDENCE;
        // Aggregation window + correlation happen asynchronously inside FARO's detection chain
        CompletableFuture.runAsync(() -> correlateReport(report, confidence),
                CompletableFuture.delayedExecutor(REPORT_CORRELATION_DELAY_SECONDS, TimeUnit.SECONDS));
        return 202;
    }

    private synchronized void correlateReport(FaroReportRequest r, double confidence) {
        String severity = severityFromContext(r);
        MockEmergency match = emergencies.values().stream()
                .filter(e -> !"CLOSED".equals(e.status))
                .filter(e -> e.category.equals(r.emergencyCategory()))
                .filter(e -> GeoUtils.distanceMeters(e.latitude, e.longitude, r.latitude(), r.longitude()) <= REPORT_CORRELATION_RADIUS_METERS)
                .findFirst().orElse(null);
        if (match != null) {
            match.confidence = Math.min(0.99, match.confidence + 0.05);
            if (SEVERITIES.indexOf(severity) > SEVERITIES.indexOf(match.severity)) {
                match.severity = severity;
            }
            match.injured |= r.hasInjured();
            match.unconscious |= r.hasUnconscious();
            match.trapped |= r.hasTrapped();
            publish(match);
            LOG.infof("[FARO mock] report correlated to emergency %d (%s)", match.id, match.eventId);
            return;
        }
        if (confidence < PUBLICATION_THRESHOLD) {
            LOG.infof("[FARO mock] anonymous report kept in aggregation window (confidence %.2f < %.2f)", confidence, PUBLICATION_THRESHOLD);
            return;
        }
        MockEmergency e = newEmergency(r.emergencyCategory(), severity, r.latitude(), r.longitude(), r.address(),
                confidence, r.hasInjured(), r.hasUnconscious(), r.hasTrapped());
        publish(e);
        LOG.infof("[FARO mock] report validated -> emergency %d published on Stream eventi (%s)", e.id, e.eventId);
    }

    private String severityFromContext(FaroReportRequest r) {
        int critical = (r.hasUnconscious() ? 1 : 0) + (r.hasTrapped() ? 1 : 0) + (r.hasBuildingCollapse() ? 1 : 0);
        if (critical >= 2) return "CRITICAL";
        if (critical == 1 || r.hasSpecialVehicleInvolved()) return "HIGH";
        if (r.hasInjured()) return "MEDIUM";
        return "LOW";
    }

    // ── Service registry ────────────────────────────────────────────────

    @Override
    public synchronized FaroCapability registerCapability(String bearerToken, String name) {
        simulateLatency();
        requireToken(bearerToken);
        if (isBlank(name)) {
            throw new FaroApiException(400, "name è obbligatorio");
        }
        if (capabilities.containsKey(name)) {
            throw new FaroApiException(400, "capability già presente nel registro");
        }
        FaroCapability c = new FaroCapability(capabilityIds.incrementAndGet(), name);
        capabilities.put(name, c);
        return c;
    }

    @Override
    public synchronized FaroService registerService(String bearerToken, FaroServiceRegistration reg) {
        simulateLatency();
        requireToken(bearerToken);
        if (reg == null || isBlank(reg.endpoint())) {
            throw new FaroApiException(400, "endpoint assente");
        }
        if (reg.type() == null || !SERVICE_TYPES.contains(reg.type())) {
            throw new FaroApiException(400, "tipologia non riconosciuta");
        }
        if (reg.latitude() == null || reg.longitude() == null || reg.capabilities() == null || reg.capabilities().isEmpty()) {
            throw new FaroApiException(400, "latitude, longitude e capabilities sono obbligatori");
        }
        for (String cap : reg.capabilities()) {
            if (!capabilities.containsKey(cap)) {
                throw new FaroApiException(400, "capability inesistente: " + cap);
            }
        }
        MockService s = new MockService();
        s.id = serviceIds.incrementAndGet();
        s.name = "SOLI - Solidarities Link";
        s.endpoint = reg.endpoint();
        s.type = reg.type();
        s.status = reg.status() != null && SERVICE_STATUSES.contains(reg.status()) ? reg.status() : "UP";
        s.avgLatency = reg.avgLatency() != null ? reg.avgLatency() : 0.0;
        s.currentLoad = reg.currentLoad() != null ? reg.currentLoad() : 0.0;
        s.latitude = reg.latitude();
        s.longitude = reg.longitude();
        s.capabilities = new ArrayList<>(reg.capabilities());
        s.lastContact = Instant.now();
        services.put(s.id, s);
        return s.toDto();
    }

    @Override
    public synchronized FaroService updateService(String bearerToken, long serviceId, FaroServicePatch patch) {
        simulateLatency();
        requireToken(bearerToken);
        MockService s = services.get(serviceId);
        if (s == null) {
            throw new FaroApiException(404, "L'identificativo indicato non è presente nel registro");
        }
        if (patch != null) {
            if (patch.status() != null) {
                if (!SERVICE_STATUSES.contains(patch.status())) {
                    throw new FaroApiException(400, "status non valido");
                }
                s.status = patch.status();
            }
            if (patch.avgLatency() != null) s.avgLatency = patch.avgLatency();
            if (patch.currentLoad() != null) s.currentLoad = patch.currentLoad();
        }
        s.lastContact = Instant.now();
        return s.toDto();
    }

    @Override
    public synchronized List<FaroService> discoverServices(String bearerToken, String capability, String type, String status) {
        simulateLatency();
        requireToken(bearerToken);
        return discover(capability, type, status);
    }

    /** Discovery as invoked internally by FARO's Binder (no gateway token involved). */
    public synchronized List<FaroService> discover(String capability, String type, String status) {
        if (isBlank(capability)) {
            throw new FaroApiException(400, "capability è obbligatoria");
        }
        Instant expiry = Instant.now().minusSeconds(HEARTBEAT_EXPIRY_SECONDS);
        List<FaroService> result = new ArrayList<>();
        for (MockService s : services.values()) {
            if (s.simulatedPeer) s.lastContact = Instant.now(); // simulated peers keep their heartbeat alive
            if (s.lastContact.isBefore(expiry) || "DOWN".equals(s.status)) continue;
            if (!s.capabilities.contains(capability)) continue;
            if (type != null && !type.equals(s.type)) continue;
            if (status != null && !status.equals(s.status)) continue;
            result.add(s.toDto());
        }
        return result;
    }

    // ── Emergencies & event stream ──────────────────────────────────────

    @Override
    public synchronized FaroEmergencyStatus getEmergency(String bearerToken, long emergencyId) {
        simulateLatency();
        requireToken(bearerToken);
        MockEmergency e = emergencies.get(emergencyId);
        if (e == null) {
            throw new FaroApiException(404, "L'identificativo indicato non corrisponde ad alcuna emergenza registrata");
        }
        advance(e);
        return e.toStatus();
    }

    @Override
    public synchronized List<FaroStreamEvent> pollEventStream(String consumerGroup) {
        Instant republishBefore = Instant.now().minusSeconds(REPUBLISH_EVERY_SECONDS);
        for (MockEmergency e : emergencies.values()) {
            advance(e);
            if (!"CLOSED".equals(e.status) && e.lastPublishedAt.isBefore(republishBefore)) {
                publish(e);
            }
        }
        int offset = Math.min(consumerOffsets.getOrDefault(consumerGroup, 0), stream.size());
        List<FaroStreamEvent> batch = new ArrayList<>(stream.subList(offset, stream.size()));
        consumerOffsets.put(consumerGroup, stream.size());
        return batch;
    }

    // ── Simulation hooks (demo only, not part of FARO's API) ────────────

    public record EmergencySnapshot(Long id, String eventId, String eventType, String severity, String status,
                                    Double latitude, Double longitude, String address, Double confidence,
                                    String workflowInstanceId, List<String> history) {
    }

    public synchronized List<EmergencySnapshot> listEmergencies() {
        return emergencies.values().stream().peek(this::advance).map(MockEmergency::snapshot).toList();
    }

    public synchronized Optional<EmergencySnapshot> findEmergency(long id) {
        MockEmergency e = emergencies.get(id);
        if (e == null) return Optional.empty();
        advance(e);
        return Optional.of(e.snapshot());
    }

    /** Simulates FARO's detection chain validating a new incident and publishing it. */
    public synchronized EmergencySnapshot openEmergency(String category, String severity, double lat, double lon, String address,
                                                        boolean injured, boolean unconscious, boolean trapped) {
        if (!CATEGORIES.contains(category)) throw new FaroApiException(400, "emergencyCategory non valida");
        if (!SEVERITIES.contains(severity)) throw new FaroApiException(400, "severity non valida");
        MockEmergency e = newEmergency(category, severity, lat, lon, address, 0.9, injured, unconscious, trapped);
        publish(e);
        return e.snapshot();
    }

    /** Simulates the orchestrator closing the intervention (GSE transition to CLOSED). */
    public synchronized EmergencySnapshot closeEmergency(long id) {
        MockEmergency e = emergencies.get(id);
        if (e == null) throw new FaroApiException(404, "Emergenza non trovata");
        advance(e);
        if (!"CLOSED".equals(e.status)) {
            e.status = "CLOSED";
            e.history.add("CLOSED");
        }
        return e.snapshot();
    }

    // ── Internals ───────────────────────────────────────────────────────

    private MockEmergency newEmergency(String category, String severity, double lat, double lon, String address,
                                       double confidence, boolean injured, boolean unconscious, boolean trapped) {
        MockEmergency e = new MockEmergency();
        e.id = emergencyIds.incrementAndGet();
        e.eventId = "evt_" + GeoUtils.geohash(lat, lon, 7) + "_" + category + "_" + (9000 + e.id); // deterministic: same sandbox seed -> same event ids across restarts
        e.category = category;
        e.severity = severity;
        e.latitude = lat;
        e.longitude = lon;
        e.address = address;
        e.confidence = confidence;
        e.injured = injured;
        e.unconscious = unconscious;
        e.trapped = trapped;
        e.status = "OPEN";
        e.history.add("OPEN");
        e.workflowInstanceId = "WF-" + category.replace("_", "") + "-" + severity.substring(0, Math.min(4, severity.length()))
                + "-001:" + Integer.toHexString(0x1000 + random.nextInt(0xefff));
        e.createdAt = Instant.now();
        emergencies.put(e.id, e);
        return e;
    }

    private void advance(MockEmergency e) {
        if ("OPEN".equals(e.status) && e.createdAt.isBefore(Instant.now().minusSeconds(OPEN_TO_IN_PROGRESS_SECONDS))) {
            e.status = "IN_PROGRESS";
            e.history.add("IN_PROGRESS");
        }
    }

    private void publish(MockEmergency e) {
        e.lastPublishedAt = Instant.now();
        stream.add(new FaroStreamEvent(
                e.eventId,
                Instant.now().toString(),
                e.category,
                e.severity,
                new FaroStreamEvent.IncidentContext(e.injured, e.unconscious, e.trapped, false),
                new FaroStreamEvent.Coordinates(e.latitude, e.longitude),
                e.address,
                Math.round(e.confidence * 100) / 100.0));
        if (stream.size() > STREAM_RETENTION) {
            int drop = stream.size() - STREAM_RETENTION;
            stream.subList(0, drop).clear();
            consumerOffsets.replaceAll((group, offset) -> Math.max(0, offset - drop));
        }
    }

    private void requireToken(String bearerToken) {
        if (bearerToken == null || !tokens.contains(bearerToken)) {
            throw new FaroApiException(401, "Token assente o non valido");
        }
    }

    private void simulateLatency() {
        try {
            Thread.sleep(40 + random.nextInt(180));
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
        }
    }

    private static boolean isBlank(String s) {
        return s == null || s.isBlank();
    }

    private record MockUser(long id, String username, String password) {
    }

    private static class MockService {
        Long id;
        String name;
        String endpoint;
        String type;
        String status;
        Double avgLatency;
        Double currentLoad;
        Double latitude;
        Double longitude;
        List<String> capabilities;
        boolean simulatedPeer;
        Instant lastContact;

        FaroService toDto() {
            return new FaroService(id, name, endpoint, type, status, avgLatency, currentLoad, latitude, longitude, List.copyOf(capabilities));
        }
    }

    private static class MockEmergency {
        Long id;
        String eventId;
        String category;
        String severity;
        double latitude;
        double longitude;
        String address;
        double confidence;
        boolean injured;
        boolean unconscious;
        boolean trapped;
        String status;
        final List<String> history = new ArrayList<>();
        String workflowInstanceId;
        Instant createdAt;
        Instant lastPublishedAt = Instant.EPOCH;

        FaroEmergencyStatus toStatus() {
            return new FaroEmergencyStatus(id, eventId, category, severity, status, latitude, longitude, workflowInstanceId, List.copyOf(history));
        }

        EmergencySnapshot snapshot() {
            return new EmergencySnapshot(id, eventId, category, severity, status, latitude, longitude, address,
                    Math.round(confidence * 100) / 100.0, workflowInstanceId, List.copyOf(history));
        }
    }
}
