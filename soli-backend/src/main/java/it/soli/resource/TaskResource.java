package it.soli.resource;

import io.quarkus.security.identity.SecurityIdentity;
import it.soli.entity.User;
import it.soli.entity.UserRole;
import it.soli.entity.Task;
import it.soli.entity.TaskStatus;
import it.soli.service.TaskService;
import jakarta.annotation.security.RolesAllowed;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.eclipse.microprofile.jwt.JsonWebToken;

import java.util.List;
import java.util.UUID;
import org.jboss.logging.Logger;

@Path("/api/tasks")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class TaskResource {

    @Inject
    TaskService taskService;

    @Inject
    SecurityIdentity securityIdentity;

    @Inject
    JsonWebToken jwt;

    private static final Logger LOG = Logger.getLogger(TaskResource.class);

    private User getAuthenticatedUser() {
        String keycloakId = jwt.getSubject();
        if (keycloakId == null) return null;
        return User.findByKeycloakId(keycloakId);
    }

    @GET
    @Path("/daily-count")
    public Response getDailyCount() {
        User currentUser = getAuthenticatedUser();
        if (currentUser == null) {
            return Response.status(Response.Status.UNAUTHORIZED).build();
        }
        long count = taskService.countTasksCreatedToday(currentUser.id);
        return Response.ok(new DailyCountDto(count, 5)).build();
    }

    public static class DailyCountDto {
        public long count;
        public int limit;
        public DailyCountDto(long count, int limit) {
            this.count = count;
            this.limit = limit;
        }
    }

    @GET
    public PaginatedResponse<Task> listAll(
            @QueryParam("page") @DefaultValue("0") int page,
            @QueryParam("size") @DefaultValue("20") int size) {
        
        User currentUser = getAuthenticatedUser();
        if (currentUser == null) {
            throw new WebApplicationException(Response.Status.UNAUTHORIZED);
        }

        if (securityIdentity.hasRole(UserRole.ADMIN.name())) {
            return PaginatedResponse.of(Task.findAll().page(page, size));
        }

        return PaginatedResponse.of(
            Task.find("creatorId = ?1 OR volunteerId = ?1 OR status = ?2", 
                currentUser.id, TaskStatus.OPEN).page(page, size)
        );
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
    public Response create(Task task) {
        try {
            User currentUser = getAuthenticatedUser();
            if (currentUser == null) {
                LOG.error("CREATE TASK: currentUser is null - jwt.getSubject() = " + jwt.getSubject());
                return Response.status(Response.Status.UNAUTHORIZED).build();
            }
            LOG.infof("CREATE TASK: user=%s (id=%s, role=%s)", currentUser.email, currentUser.id, currentUser.role);
            LOG.infof("CREATE TASK: payload title=%s, category=%s, urgency=%s, creatorId=%s, beneficiaryId=%s",
                task.title, task.category, task.urgencyLevel, task.creatorId, task.beneficiaryId);

            // Enforce the creator to be the current user, unless admin is doing it for someone else
            if (task.creatorId != null && !task.creatorId.equals(currentUser.id) && !securityIdentity.hasRole(UserRole.ADMIN.name())) {
                LOG.warn("CREATE TASK: Forbidden - creatorId mismatch");
                return Response.status(Response.Status.FORBIDDEN).build();
            }
            
            if (task.creatorId == null) {
                task.creatorId = currentUser.id;
            }

            if (task.beneficiaryId == null) {
                task.beneficiaryId = task.creatorId;
            }

            LOG.infof("CREATE TASK: final creatorId=%s, beneficiaryId=%s", task.creatorId, task.beneficiaryId);
            task = taskService.createTask(task);
            LOG.infof("CREATE TASK: SUCCESS id=%s", task.id);
            return Response.status(Response.Status.CREATED).entity(task).build();
        } catch (Exception e) {
            LOG.error("CREATE TASK: EXCEPTION", e);
            throw e; // Re-throw so Quarkus can handle it
        }
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

        // Allow if user is becoming the volunteer
        boolean isBecomingVolunteer = task.status == TaskStatus.OPEN && updatedTask.status == TaskStatus.ACCEPTED;

        // Only creator, assigned volunteer, or admin can update the task
        boolean isCreator = task.creatorId != null && task.creatorId.equals(currentUser.id);
        boolean isVolunteer = task.volunteerId != null && task.volunteerId.equals(currentUser.id);
        boolean isAdmin = securityIdentity.hasRole(UserRole.ADMIN.name());

        if (!isCreator && !isVolunteer && !isAdmin && !isBecomingVolunteer) {
            return Response.status(Response.Status.FORBIDDEN).build();
        }

        if (updatedTask.title != null) task.title = updatedTask.title;
        if (updatedTask.description != null) task.description = updatedTask.description;
        if (updatedTask.scheduledAt != null) task.scheduledAt = updatedTask.scheduledAt;
        if (updatedTask.category != null) task.category = updatedTask.category;
        if (updatedTask.targetAddress != null) task.targetAddress = updatedTask.targetAddress;
        if (updatedTask.targetLocation != null) task.targetLocation = updatedTask.targetLocation;
        if (updatedTask.latitude != null) task.latitude = updatedTask.latitude;
        if (updatedTask.longitude != null) task.longitude = updatedTask.longitude;

        if (updatedTask.status != null && task.status != updatedTask.status) {
            if (updatedTask.status == TaskStatus.ACCEPTED) {
                UUID volId = updatedTask.volunteerId != null ? updatedTask.volunteerId : currentUser.id;
                taskService.assignTask(id, volId);
            } else if (updatedTask.status == TaskStatus.CANCELLED) {
                taskService.cancelTask(id, currentUser.id);
            } else {
                task.status = updatedTask.status;
            }
        }
        
        if (isAdmin || isCreator) {
            if (updatedTask.rewardCredits != null) task.rewardCredits = updatedTask.rewardCredits;
            if (updatedTask.urgencyLevel != null) task.urgencyLevel = updatedTask.urgencyLevel;
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

        if (task.creatorId != null && !task.creatorId.equals(currentUser.id) && !securityIdentity.hasRole(UserRole.ADMIN.name())) {
            return Response.status(Response.Status.FORBIDDEN).build();
        }

        task.delete();
        return Response.noContent().build();
    }

    public static class TokenDto {
        public String token;
    }

    @POST
    @Path("/{id}/checkin")
    @Transactional
    public Response checkIn(@PathParam("id") UUID id, TokenDto payload) {
        User currentUser = getAuthenticatedUser();
        if (currentUser == null) return Response.status(Response.Status.UNAUTHORIZED).build();

        if (payload == null || payload.token == null || payload.token.isBlank()) {
            return Response.status(Response.Status.BAD_REQUEST).entity("Token is required").build();
        }

        try {
            Task task = taskService.checkInTask(id, currentUser.id, payload.token);
            return Response.ok(task).build();
        } catch (IllegalArgumentException e) {
            return Response.status(Response.Status.BAD_REQUEST).entity(e.getMessage()).build();
        }
    }

    @POST
    @Path("/{id}/checkout")
    @Transactional
    public Response checkOut(@PathParam("id") UUID id, TokenDto payload) {
        User currentUser = getAuthenticatedUser();
        if (currentUser == null) return Response.status(Response.Status.UNAUTHORIZED).build();

        if (payload == null || payload.token == null || payload.token.isBlank()) {
            return Response.status(Response.Status.BAD_REQUEST).entity("Token is required").build();
        }

        try {
            Task task = taskService.checkOutTask(id, currentUser.id, payload.token);
            return Response.ok(task).build();
        } catch (IllegalArgumentException e) {
            return Response.status(Response.Status.BAD_REQUEST).entity(e.getMessage()).build();
        }
    }

    @POST
    @Path("/{id}/confirm-completion")
    @Transactional
    public Response confirmCompletion(@PathParam("id") UUID id) {
        User currentUser = getAuthenticatedUser();
        if (currentUser == null) return Response.status(Response.Status.UNAUTHORIZED).build();

        try {
            Task task = taskService.confirmCompletion(id, currentUser.id);
            return Response.ok(task).build();
        } catch (IllegalArgumentException e) {
            return Response.status(Response.Status.BAD_REQUEST).entity(e.getMessage()).build();
        }
    }
}
