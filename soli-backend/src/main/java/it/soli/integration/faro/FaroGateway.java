package it.soli.integration.faro;

import it.soli.integration.faro.dto.*;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.jboss.logging.Logger;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;

/**
 * Single entry point used by SOLI to talk to FARO: manages the session with FARO's
 * Gestore Autenticazione (SOLI is a registered, verified reporter), transparently
 * re-authenticates on 401 and traces every exchange in {@link FaroCallLog}.
 */
@ApplicationScoped
public class FaroGateway {

    private static final Logger LOG = Logger.getLogger(FaroGateway.class);
    public static final String CONSUMER_GROUP = "soli-platform";
    public static final String EVENTS_TOPIC = "faro.events.detected";

    @Inject
    FaroClient client;

    @Inject
    FaroCallLogger callLogger;

    @Inject
    FaroStateService stateService;

    @Inject
    FaroConfig config;

    private volatile String token;

    public boolean enabled() {
        return config.enabled();
    }

    // ── FARO APIs ───────────────────────────────────────────────────────

    public int sendReport(FaroReportRequest report, UUID actorId, UUID taskId) {
        return authenticated("POST", "/api/reports", report, 202, actorId, taskId,
                t -> client.sendReport(t, report));
    }

    public FaroCapability registerCapability(String name) {
        return authenticated("POST", "/api/capabilities", Map.of("name", name), 201, null, null,
                t -> client.registerCapability(t, name));
    }

    public FaroService registerService(FaroServiceRegistration registration) {
        return authenticated("POST", "/api/services", registration, 201, null, null,
                t -> client.registerService(t, registration));
    }

    public FaroService updateService(long serviceId, FaroServicePatch patch) {
        return authenticated("PATCH", "/api/services/" + serviceId, patch, 200, null, null,
                t -> client.updateService(t, serviceId, patch));
    }

    public List<FaroService> discoverServices(String capability) {
        return authenticated("GET", "/api/services?capability=" + capability, null, 200, null, null,
                t -> client.discoverServices(t, capability, null, null));
    }

    public FaroEmergencyStatus getEmergency(long emergencyId) {
        return authenticated("GET", "/api/emergencies/" + emergencyId, null, 200, null, null,
                t -> client.getEmergency(t, emergencyId));
    }

    /** Poll of the Stream eventi topic; only non-empty batches are traced. */
    public List<FaroStreamEvent> pollEventStream() {
        long start = System.currentTimeMillis();
        List<FaroStreamEvent> batch = client.pollEventStream(CONSUMER_GROUP);
        if (!batch.isEmpty()) {
            callLogger.log(FaroCallLog.Direction.OUTBOUND, "CONSUME",
                    "kafka://" + EVENTS_TOPIC + "?group=" + CONSUMER_GROUP, null,
                    null, batch, System.currentTimeMillis() - start, null, null);
        }
        return batch;
    }

    // ── Session handling ────────────────────────────────────────────────

    private <T> T authenticated(String method, String uri, Object request, int successStatus,
                                UUID actorId, UUID taskId, Function<String, T> call) {
        try {
            return traced(method, uri, request, successStatus, actorId, taskId, () -> call.apply(session()));
        } catch (FaroApiException e) {
            if (e.status != 401) throw e;
            LOG.info("[FARO] session rejected, re-authenticating");
            token = null;
            return traced(method, uri, request, successStatus, actorId, taskId, () -> call.apply(session()));
        }
    }

    private synchronized String session() {
        if (token != null) {
            return token;
        }
        FaroCredentials credentials = new FaroCredentials(config.username(), config.password());
        Long userId = stateService.snapshot().faroUserId();
        if (userId != null) {
            try {
                token = login(userId, credentials);
                return token;
            } catch (FaroApiException e) {
                if (e.status != 401) throw e;
            }
        }
        FaroUser user = traced("POST", "/api/users", Map.of("username", credentials.username(), "password", "******"),
                201, null, null, () -> client.registerUser(credentials));
        stateService.saveUserId(user.id());
        token = login(user.id(), credentials);
        return token;
    }

    private String login(long userId, FaroCredentials credentials) {
        FaroSession session = traced("POST", "/api/users/" + userId + "/sessions",
                Map.of("username", credentials.username(), "password", "******"), 200, null, null,
                () -> client.login(userId, credentials));
        return session.token();
    }

    private <T> T traced(String method, String uri, Object request, int successStatus,
                         UUID actorId, UUID taskId, java.util.function.Supplier<T> call) {
        long start = System.currentTimeMillis();
        try {
            T response = call.get();
            Object loggedResponse = response instanceof FaroSession s
                    ? Map.of("token", s.token().substring(0, Math.min(20, s.token().length())) + "…", "tokenType", s.tokenType(), "expiresIn", s.expiresIn())
                    : response instanceof Integer ? null : response;
            callLogger.log(FaroCallLog.Direction.OUTBOUND, method, uri,
                    response instanceof Integer status ? status : successStatus,
                    request, loggedResponse, System.currentTimeMillis() - start, actorId, taskId);
            return response;
        } catch (FaroApiException e) {
            callLogger.log(FaroCallLog.Direction.OUTBOUND, method, uri, e.status, request,
                    Map.of("error", String.valueOf(e.getMessage())), System.currentTimeMillis() - start, actorId, taskId);
            throw e;
        }
    }
}
