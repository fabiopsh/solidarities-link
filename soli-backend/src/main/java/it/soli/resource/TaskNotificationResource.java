package it.soli.resource;

import io.quarkus.security.identity.SecurityIdentity;
import it.soli.entity.User;
import it.soli.entity.UserRole;
import it.soli.entity.TaskNotification;
import jakarta.annotation.security.RolesAllowed;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.eclipse.microprofile.jwt.JsonWebToken;

import java.util.List;
import java.util.UUID;
import java.time.LocalDateTime;

@Path("/api/task-notifications")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class TaskNotificationResource {

    @Inject
    SecurityIdentity securityIdentity;

    @Inject
    JsonWebToken jwt;

    private User getAuthenticatedUser() {
        String keycloakId = jwt.getSubject();
        if (keycloakId == null) return null;
        return User.findByKeycloakId(keycloakId);
    }

    @GET
    @RolesAllowed({"VOLUNTEER", "ADMIN"})
    public Response listMyNotifications(
            @QueryParam("page") @DefaultValue("0") int page,
            @QueryParam("size") @DefaultValue("20") int size) {
        User currentUser = getAuthenticatedUser();
        if (currentUser == null) return Response.status(Response.Status.UNAUTHORIZED).build();

        if (securityIdentity.hasRole(UserRole.ADMIN.name())) {
             return Response.ok(PaginatedResponse.of(TaskNotification.findAll().page(page, size))).build();
        }

        return Response.ok(PaginatedResponse.of(TaskNotification.find("volunteerId", currentUser.id).page(page, size))).build();
    }

    @PUT
    @Path("/{id}/respond")
    @Transactional
    @RolesAllowed({"VOLUNTEER"})
    public Response respondToNotification(@PathParam("id") UUID id, TaskNotification responseData) {
        TaskNotification notification = TaskNotification.findById(id);
        if (notification == null) {
            return Response.status(Response.Status.NOT_FOUND).build();
        }

        User currentUser = getAuthenticatedUser();
        if (currentUser == null) return Response.status(Response.Status.UNAUTHORIZED).build();

        if (!notification.volunteerId.equals(currentUser.id)) {
            return Response.status(Response.Status.FORBIDDEN).build();
        }

        notification.status = responseData.status;
        notification.respondedAt = LocalDateTime.now();

        return Response.ok(notification).build();
    }
}
