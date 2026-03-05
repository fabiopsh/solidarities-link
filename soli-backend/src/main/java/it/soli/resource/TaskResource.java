package it.soli.resource;

import io.quarkus.security.identity.SecurityIdentity;
import it.soli.entity.User;
import it.soli.entity.UserRole;
import it.soli.entity.Task;
import jakarta.annotation.security.RolesAllowed;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.eclipse.microprofile.jwt.JsonWebToken;

import java.util.List;
import java.util.UUID;

@Path("/api/tasks")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class TaskResource {

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
    public PaginatedResponse<Task> listAll(
            @QueryParam("page") @DefaultValue("0") int page,
            @QueryParam("size") @DefaultValue("20") int size) {
        // In a real app, this would be filtered by proximity, permissions, etc.
        return PaginatedResponse.of(Task.findAll().page(page, size));
    }

    @GET
    @Path("/{id}")
    public Response getById(@PathParam("id") UUID id) {
        Task task = Task.findById(id);
        if (task == null) {
            return Response.status(Response.Status.NOT_FOUND).build();
        }
        return Response.ok(task).build();
    }

    @POST
    @Transactional
    @RolesAllowed({"REQUESTER", "CAREGIVER", "ADMIN"})
    public Response create(Task task) {
        User currentUser = getAuthenticatedUser();
        if (currentUser == null) return Response.status(Response.Status.UNAUTHORIZED).build();

        // Enforce the creator to be the current user, unless admin is doing it for someone else
        if (task.creatorId != null && !task.creatorId.equals(currentUser.id) && !securityIdentity.hasRole(UserRole.ADMIN.name())) {
            return Response.status(Response.Status.FORBIDDEN).build();
        }
        
        if (task.creatorId == null) {
            task.creatorId = currentUser.id;
        }

        task.persist();
        return Response.status(Response.Status.CREATED).entity(task).build();
    }

    @PUT
    @Path("/{id}")
    @Transactional
    public Response update(@PathParam("id") UUID id, Task updatedTask) {
        Task task = Task.findById(id);
        if (task == null) {
            return Response.status(Response.Status.NOT_FOUND).build();
        }

        User currentUser = getAuthenticatedUser();
        if (currentUser == null) return Response.status(Response.Status.UNAUTHORIZED).build();

        // Only creator, assigned volunteer, or admin can update the task
        boolean isCreator = task.creatorId.equals(currentUser.id);
        boolean isVolunteer = task.volunteerId != null && task.volunteerId.equals(currentUser.id);
        boolean isAdmin = securityIdentity.hasRole(UserRole.ADMIN.name());

        if (!isCreator && !isVolunteer && !isAdmin) {
            return Response.status(Response.Status.FORBIDDEN).build();
        }

        task.title = updatedTask.title;
        task.description = updatedTask.description;
        task.status = updatedTask.status;
        task.scheduledAt = updatedTask.scheduledAt;
        
        if (isAdmin || isCreator) {
            task.rewardCredits = updatedTask.rewardCredits;
            task.urgencyLevel = updatedTask.urgencyLevel;
        }

        return Response.ok(task).build();
    }

    @DELETE
    @Path("/{id}")
    @Transactional
    public Response delete(@PathParam("id") UUID id) {
        Task task = Task.findById(id);
        if (task == null) {
            return Response.status(Response.Status.NOT_FOUND).build();
        }

        User currentUser = getAuthenticatedUser();
        if (currentUser == null) return Response.status(Response.Status.UNAUTHORIZED).build();

        if (!task.creatorId.equals(currentUser.id) && !securityIdentity.hasRole(UserRole.ADMIN.name())) {
            return Response.status(Response.Status.FORBIDDEN).build();
        }

        task.delete();
        return Response.noContent().build();
    }
}
