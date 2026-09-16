package it.soli.integration.cassitrack;

import it.soli.entity.*;
import it.soli.integration.cassitrack.dto.CtApiException;
import it.soli.service.MatchingService;
import jakarta.annotation.security.RolesAllowed;
import jakarta.inject.Inject;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.eclipse.microprofile.jwt.JsonWebToken;

import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.function.Supplier;

/** Territorial mobility features backed by CassiTrack + OmniMove (Cassino). Authenticated SOLI users. */
@Path("/api/integrations/cassitrack")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class CassiTrackResource {

    private static final Set<TaskStatus> ISSUE_STATUSES = Set.of(TaskStatus.ACCEPTED, TaskStatus.IN_PROGRESS);

    @Inject
    JsonWebToken jwt;

    @Inject
    TransitService transit;

    @Inject
    TransitMatchingAdvisor advisor;

    @Inject
    MatchingService matchingService;

    /** TPL layer for the map: routes, live vehicles, active incidents and network KPIs. */
    @GET
    @Path("/network")
    public Response network() {
        if (!transit.enabled()) return disabled();
        return call(() -> transit.network());
    }

    /** Next arrivals at a stop (live OBU data merged with the timetable). */
    @GET
    @Path("/stops/{stopId}/arrivals")
    public Response arrivals(@PathParam("stopId") String stopId, @QueryParam("limit") @DefaultValue("6") int limit) {
        if (!transit.enabled()) return disabled();
        return call(() -> transit.stopArrivals(stopId, limit));
    }

    /** TPL support for a task: nearby stops, accompaniment trip, how the viewer reaches the meeting point, disruptions. */
    @GET
    @Path("/tasks/{taskId}/transit")
    public Response taskTransit(@PathParam("taskId") UUID taskId, @QueryParam("destinationStopId") String destinationStopId) {
        if (!transit.enabled()) return disabled();
        User user = currentUser();
        if (user == null) return Response.status(Response.Status.UNAUTHORIZED).build();
        Task task = Task.findById(taskId);
        if (task == null) return Response.status(Response.Status.NOT_FOUND).build();
        boolean creator = user.id.equals(task.creatorId);
        boolean exact = creator || user.id.equals(task.volunteerId);
        VolunteerProfile profile = creator ? null : VolunteerProfile.findByUserId(user.id);
        return call(() -> transit.taskTransit(task, profile, destinationStopId, exact));
    }

    /** Distance ranking vs TPL-aware ranking of the volunteers for a task. Requester of the task or admin. */
    @GET
    @Path("/tasks/{taskId}/matching")
    public Response matching(@PathParam("taskId") UUID taskId) {
        if (!transit.enabled()) return disabled();
        User user = currentUser();
        if (user == null) return Response.status(Response.Status.UNAUTHORIZED).build();
        Task task = Task.findById(taskId);
        if (task == null) return Response.status(Response.Status.NOT_FOUND).build();
        if (!user.id.equals(task.creatorId) && user.role != UserRole.ADMIN) {
            return error(Response.Status.FORBIDDEN, "Solo il richiedente del task può vedere il matching");
        }
        if (task.latitude == null || task.longitude == null) {
            return Response.ok(advisor.explain(task, java.util.List.of())).build();
        }
        return call(() -> {
            var competent = matchingService.findCompetentVolunteers(task.category, task.latitude, task.longitude).stream()
                    .filter(c -> !c.profile.userId.equals(task.creatorId) && !c.profile.userId.equals(task.beneficiaryId))
                    .collect(java.util.stream.Collectors.toList());
            matchingService.countPreviousNotifications(competent);
            return advisor.explain(task, competent);
        });
    }

    /** Disruptions of the TPL network touching the active tasks of the current user. */
    @GET
    @Path("/alerts/my")
    public Response myAlerts() {
        if (!transit.enabled()) return Response.ok(java.util.List.of()).build();
        User user = currentUser();
        if (user == null) return Response.status(Response.Status.UNAUTHORIZED).build();
        return call(() -> transit.alertsFor(user));
    }

    /** Route problem reported by the assigned volunteer: forwarded to CassiTrack and optionally notified in chat. */
    @POST
    @Path("/tasks/{taskId}/route-issues")
    public Response reportIssue(@PathParam("taskId") UUID taskId, TransitService.IssueRequest body) {
        if (!transit.enabled()) return disabled();
        User user = currentUser();
        if (user == null) return Response.status(Response.Status.UNAUTHORIZED).build();
        Task task = Task.findById(taskId);
        if (task == null) return Response.status(Response.Status.NOT_FOUND).build();
        if (!user.id.equals(task.volunteerId)) {
            return error(Response.Status.FORBIDDEN, "Solo il volontario assegnato può segnalare problemi sul percorso");
        }
        if (!ISSUE_STATUSES.contains(task.status)) {
            return error(Response.Status.CONFLICT, "Segnalazione disponibile solo per task accettati o in corso");
        }
        if (body == null || body.type() == null) {
            return error(Response.Status.BAD_REQUEST, "Tipo di problema mancante");
        }
        if (!transit.covered(task.latitude, task.longitude)) {
            return error(Response.Status.BAD_REQUEST, "Il task è fuori dall'area servita da CassiTrack");
        }
        try {
            return Response.status(Response.Status.CREATED).entity(transit.reportIssue(task, user, body)).build();
        } catch (CtApiException e) {
            return unavailable(e);
        }
    }

    /** Mobility section of the admin dashboard. */
    @GET
    @Path("/analytics")
    @RolesAllowed({"ADMIN"})
    public Response analytics() {
        if (!transit.enabled()) return disabled();
        return call(() -> transit.analytics());
    }

    private User currentUser() {
        return jwt.getSubject() == null ? null : User.findByKeycloakId(jwt.getSubject());
    }

    private static Response call(Supplier<Object> fn) {
        try {
            return Response.ok(fn.get()).build();
        } catch (CtApiException e) {
            return unavailable(e);
        }
    }

    private static Response disabled() {
        return error(Response.Status.SERVICE_UNAVAILABLE, "Integrazione CassiTrack disabilitata");
    }

    private static Response unavailable(CtApiException e) {
        return Response.status(Response.Status.BAD_GATEWAY)
                .entity(Map.of("error", "CassiTrack/OmniMove non disponibile: " + e.getMessage(), "partnerStatus", e.status))
                .build();
    }

    private static Response error(Response.Status status, String message) {
        return Response.status(status).entity(Map.of("error", message)).build();
    }
}
