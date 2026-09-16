package it.soli.integration.faro;

import io.quarkus.panache.common.Sort;
import it.soli.integration.faro.dto.FaroApiException;
import it.soli.integration.faro.dto.FaroEngageRequest;
import it.soli.integration.faro.dto.FaroService;
import jakarta.annotation.security.RolesAllowed;
import jakarta.inject.Inject;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

import java.util.*;

/**
 * Demo controls acting "on FARO's side" of the simulated sandbox: open/close emergencies and
 * run FARO's Binder against the service registry (discovery -> ordering -> engage with fallback).
 * Not part of the integration contract; admin only.
 */
@Path("/api/integrations/faro/simulate")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@RolesAllowed("ADMIN")
public class FaroSimulationResource {

    public record OpenEmergencyRequest(String category, String severity, Double latitude, Double longitude, String address,
                                       boolean hasInjured, boolean hasUnconscious, boolean hasTrapped) {
    }

    public record BinderRequest(Long emergencyId, String capability, Integer requestedVolunteers, String notes) {
    }

    public record BinderAttempt(Long serviceId, String serviceName, String type, String endpoint,
                                int distanceMeters, int httpStatus, Object response) {
    }

    @Inject
    MockFaroClient faro;

    @Inject
    FaroEngageHandler engageHandler;

    @Inject
    FaroEventStreamConsumer consumer;

    @Inject
    FaroConfig config;

    @GET
    @Path("/emergencies")
    public List<MockFaroClient.EmergencySnapshot> emergencies() {
        return faro.listEmergencies();
    }

    @POST
    @Path("/emergencies")
    public Response openEmergency(OpenEmergencyRequest req) {
        if (req == null || req.category() == null || req.latitude() == null || req.longitude() == null) {
            return Response.status(400).entity(Map.of("error", "category, latitude e longitude sono obbligatori")).build();
        }
        try {
            MockFaroClient.EmergencySnapshot e = faro.openEmergency(req.category(),
                    req.severity() == null ? "HIGH" : req.severity(), req.latitude(), req.longitude(),
                    req.address() == null ? "Posizione simulata" : req.address(),
                    req.hasInjured(), req.hasUnconscious(), req.hasTrapped());
            consumer.sync();
            return Response.status(201).entity(e).build();
        } catch (FaroApiException ex) {
            return Response.status(ex.status).entity(Map.of("error", ex.getMessage())).build();
        }
    }

    @POST
    @Path("/emergencies/{id}/close")
    @Consumes(MediaType.WILDCARD)
    public Response closeEmergency(@PathParam("id") long id) {
        try {
            MockFaroClient.EmergencySnapshot e = faro.closeEmergency(id);
            consumer.sync();
            return Response.ok(e).build();
        } catch (FaroApiException ex) {
            return Response.status(ex.status).entity(Map.of("error", ex.getMessage())).build();
        }
    }

    /** Runs FARO's Binder for one capability task of the emergency's plan. */
    @POST
    @Path("/binder/engage")
    public Response binderEngage(BinderRequest req) {
        if (req == null || req.emergencyId() == null || req.capability() == null) {
            return Response.status(400).entity(Map.of("error", "emergencyId e capability sono obbligatori")).build();
        }
        MockFaroClient.EmergencySnapshot e = faro.findEmergency(req.emergencyId()).orElse(null);
        if (e == null) {
            return Response.status(404).entity(Map.of("error", "Emergenza non trovata")).build();
        }

        // 1. Discovery on the service registry (GSV)
        List<FaroService> candidates = new ArrayList<>(faro.discover(req.capability(), null, null));
        // 2. Ordering by the Gestione Risorse subsystem: distance, average latency, current load
        candidates.sort(Comparator.comparingDouble(s -> score(s, e)));

        int riskRadius = GeoUtils.riskRadiusMeters(e.severity(), config.safetyRadiusMeters());
        int meetingDistance = riskRadius + 400;
        FaroEngageRequest request = new FaroEngageRequest(e.id(), e.eventId(), e.workflowInstanceId(), req.capability(),
                e.eventType(), e.severity(), e.latitude(), e.longitude(), e.address(),
                new FaroEngageRequest.MeetingPoint(GeoUtils.latitudeNorthOf(e.latitude(), meetingDistance), e.longitude(),
                        "Area di attesa Protezione Civile, " + meetingDistance + " m a nord di " + e.address()),
                req.requestedVolunteers() == null ? 2 : req.requestedVolunteers(), req.notes());

        // 3. Engagement loop with fallback: discard 503/409 and try the next candidate
        List<BinderAttempt> attempts = new ArrayList<>();
        String outcome = "EXHAUSTED";
        for (FaroService s : candidates) {
            int distance = (int) Math.round(GeoUtils.distanceMeters(e.latitude(), e.longitude(), s.latitude(), s.longitude()));
            FaroEngageHandler.Outcome o;
            if (config.engageEndpoint().equals(s.endpoint())) {
                o = engageHandler.handle(request);
            } else {
                o = simulatedPeer(s);
            }
            attempts.add(new BinderAttempt(s.id(), s.name(), s.type(), s.endpoint(), distance, o.status(), o.body()));
            if (o.status() >= 200 && o.status() < 300) {
                outcome = "ENGAGED";
                break;
            }
        }
        consumer.sync();

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("emergency", e);
        result.put("capability", req.capability());
        result.put("engageRequest", request);
        result.put("candidates", candidates.size());
        result.put("attempts", attempts);
        result.put("outcome", outcome);
        result.put("note", "ENGAGED".equals(outcome)
                ? "Task del piano completato: risorsa ingaggiata"
                : "Candidati esauriti: il task viene ceduto alla sala operativa (human-in-the-loop)");
        return Response.ok(result).build();
    }

    @GET
    @Path("/calls")
    public List<FaroCallLog> calls(@QueryParam("limit") @DefaultValue("50") int limit) {
        return FaroCallLog.findAll(Sort.descending("timestamp")).page(0, Math.min(limit, 500)).list();
    }

    private static double score(FaroService s, MockFaroClient.EmergencySnapshot e) {
        double km = GeoUtils.distanceMeters(e.latitude(), e.longitude(), s.latitude(), s.longitude()) / 1000.0;
        double latency = s.avgLatency() == null ? 0 : s.avgLatency() / 100.0;
        double load = s.currentLoad() == null ? 0 : s.currentLoad() * 5;
        return km + latency + load;
    }

    /** Third-party services of the sandbox: the other volunteering group is always saturated. */
    private static FaroEngageHandler.Outcome simulatedPeer(FaroService s) {
        if ("CIVIC_VOLUNTEERING".equals(s.type())) {
            return new FaroEngageHandler.Outcome(503, Map.of("error", "Tutti i volontari del presidio sono già impegnati"));
        }
        return new FaroEngageHandler.Outcome(200, Map.of("status", "ENGAGED"));
    }
}
