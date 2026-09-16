package it.soli.integration.faro;

import it.soli.entity.Task;
import it.soli.entity.TaskStatus;
import it.soli.entity.User;
import it.soli.integration.faro.dto.FaroApiException;
import it.soli.integration.faro.dto.FaroReportRequest;
import jakarta.inject.Inject;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.eclipse.microprofile.jwt.JsonWebToken;

import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.temporal.ChronoUnit;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/** FARO features for authenticated SOLI users (volunteers and requesters). */
@Path("/api/integrations/faro")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class FaroResource {

    public record EmergencyDto(UUID id, String eventId, Long faroEmergencyId, String category, String severity,
                               Double latitude, Double longitude, String address, Double confidence,
                               boolean hasInjured, boolean hasUnconscious, boolean hasTrapped,
                               String faroStatus, boolean engaged, int riskRadiusMeters, Integer distanceMeters,
                               LocalDateTime firstSeenAt, LocalDateTime lastUpdateAt) {
    }

    public record SafetyDto(boolean inRiskArea, List<EmergencyDto> nearbyEmergencies) {
    }

    public record SosRequest(String emergencyCategory, String description, boolean hasInjured, boolean hasUnconscious,
                             boolean hasTrapped, boolean hasSpecialVehicleInvolved, boolean hasBuildingCollapse) {
    }

    public record SosResponse(int httpStatus, String endpoint, OffsetDateTime sentAt, FaroReportRequest report, String message) {
    }

    private static final Set<TaskStatus> SOS_STATUSES = Set.of(TaskStatus.ACCEPTED, TaskStatus.IN_PROGRESS);

    @Inject
    JsonWebToken jwt;

    @Inject
    FaroGateway gateway;

    @Inject
    FaroConfig config;

    @Inject
    FaroStateService stateService;

    /** Active emergencies received from FARO's Stream eventi, for the map. */
    @GET
    @Path("/emergencies")
    public List<EmergencyDto> activeEmergencies() {
        return FaroEmergency.listActive().stream().map(e -> toDto(e, null)).toList();
    }

    /** Whether a task lies inside the risk perimeter of an active emergency. */
    @GET
    @Path("/tasks/{taskId}/safety")
    public Response taskSafety(@PathParam("taskId") UUID taskId) {
        Task task = Task.findById(taskId);
        if (task == null) {
            return Response.status(Response.Status.NOT_FOUND).build();
        }
        if (task.latitude == null || task.longitude == null) {
            return Response.ok(new SafetyDto(false, List.of())).build();
        }
        List<EmergencyDto> nearby = FaroEmergency.listActive().stream()
                .map(e -> toDto(e, (int) Math.round(GeoUtils.distanceMeters(task.latitude, task.longitude, e.latitude, e.longitude))))
                .filter(e -> e.distanceMeters() <= e.riskRadiusMeters() * 2)
                .sorted(Comparator.comparingInt(EmergencyDto::distanceMeters))
                .toList();
        boolean inRiskArea = nearby.stream().anyMatch(e -> e.distanceMeters() <= e.riskRadiusMeters());
        return Response.ok(new SafetyDto(inRiskArea, nearby)).build();
    }

    /** SOS raised during an active task: forwarded to FARO as an authenticated report (POST /api/reports). */
    @POST
    @Path("/tasks/{taskId}/sos")
    public Response sos(@PathParam("taskId") UUID taskId, SosRequest body) {
        User user = jwt.getSubject() == null ? null : User.findByKeycloakId(jwt.getSubject());
        if (user == null) {
            return Response.status(Response.Status.UNAUTHORIZED).build();
        }
        Task task = Task.findById(taskId);
        if (task == null) {
            return Response.status(Response.Status.NOT_FOUND).build();
        }
        if (!user.id.equals(task.volunteerId) && !user.id.equals(task.creatorId)) {
            return error(Response.Status.FORBIDDEN, "Solo il volontario o il richiedente del task possono inviare un SOS");
        }
        if (!SOS_STATUSES.contains(task.status)) {
            return error(Response.Status.CONFLICT, "L'SOS è disponibile solo per task accettati o in corso");
        }
        if (body == null || body.emergencyCategory() == null || !MockFaroClient.CATEGORIES.contains(body.emergencyCategory())) {
            return error(Response.Status.BAD_REQUEST, "Categoria di emergenza non valida");
        }
        if (task.latitude == null || task.longitude == null) {
            return error(Response.Status.BAD_REQUEST, "Il task non ha una posizione geografica");
        }
        if (!gateway.enabled()) {
            return error(Response.Status.SERVICE_UNAVAILABLE, "Integrazione FARO non attiva: chiama il 112");
        }

        String note = body.description() == null || body.description().isBlank() ? "" : " " + body.description().trim();
        FaroReportRequest report = new FaroReportRequest(
                body.emergencyCategory(),
                task.latitude,
                task.longitude,
                OffsetDateTime.now().truncatedTo(ChronoUnit.SECONDS).toString(),
                task.targetAddress != null ? task.targetAddress : task.targetLocation,
                "[SOLI - segnalazione durante task di volontariato]" + note,
                body.hasInjured(),
                body.hasUnconscious(),
                body.hasTrapped(),
                body.hasSpecialVehicleInvolved(),
                body.hasBuildingCollapse());
        try {
            int status = gateway.sendReport(report, user.id, task.id);
            return Response.status(Response.Status.ACCEPTED).entity(new SosResponse(status, "POST /api/reports",
                    OffsetDateTime.now(), report,
                    "Segnalazione presa in carico da FARO. Se ci sono persone in pericolo chiama comunque il 112.")).build();
        } catch (FaroApiException e) {
            return Response.status(Response.Status.BAD_GATEWAY)
                    .entity(Map.of("error", "FARO non ha accettato la segnalazione: " + e.getMessage() + ". Chiama il 112.",
                            "faroStatus", e.status)).build();
        }
    }

    /** SOLI's registration in FARO's service registry. */
    @GET
    @Path("/status")
    public Map<String, Object> status() {
        FaroStateService.Snapshot s = stateService.snapshot();
        return Map.of(
                "enabled", config.enabled(),
                "mode", config.mode(),
                "faroBaseUrl", config.baseUrl(),
                "registration", s);
    }

    private EmergencyDto toDto(FaroEmergency e, Integer distanceMeters) {
        return new EmergencyDto(e.id, e.eventId, e.faroEmergencyId, e.category, e.severity, e.latitude, e.longitude,
                e.address, e.confidence, Boolean.TRUE.equals(e.hasInjured), Boolean.TRUE.equals(e.hasUnconscious),
                Boolean.TRUE.equals(e.hasTrapped), e.faroStatus, Boolean.TRUE.equals(e.engaged),
                GeoUtils.riskRadiusMeters(e.severity, config.safetyRadiusMeters()), distanceMeters,
                e.firstSeenAt, e.lastUpdateAt);
    }

    private static Response error(Response.Status status, String message) {
        return Response.status(status).entity(Map.of("error", message)).build();
    }
}
