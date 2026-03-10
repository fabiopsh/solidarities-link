package it.soli.resource;

import io.quarkus.security.identity.SecurityIdentity;
import it.soli.entity.User;
import it.soli.entity.UserRole;
import it.soli.entity.VolunteerProfile;
import jakarta.annotation.security.RolesAllowed;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.eclipse.microprofile.jwt.JsonWebToken;

import java.util.List;
import java.util.UUID;

@Path("/api/volunteer-profiles")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class VolunteerProfileResource {

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
    @RolesAllowed({"ADMIN"})
    public PaginatedResponse<VolunteerProfile> listAll(
            @QueryParam("page") @DefaultValue("0") int page,
            @QueryParam("size") @DefaultValue("20") int size) {
        return PaginatedResponse.of(VolunteerProfile.findAll().page(page, size));
    }

    @GET
    @Path("/my")
    @Transactional
    public Response getMyProfile() {
        User currentUser = getAuthenticatedUser();
        if (currentUser == null) return Response.status(Response.Status.UNAUTHORIZED).build();

        VolunteerProfile profile = VolunteerProfile.findByUserId(currentUser.id);
        if (profile == null) {
            return Response.status(Response.Status.NOT_FOUND).build();
        }

        return Response.ok(profile).build();
    }

    @GET
    @Path("/{id}")
    @Transactional
    public Response getById(@PathParam("id") UUID id) {
        VolunteerProfile profile = VolunteerProfile.findById(id);
        if (profile == null) {
            return Response.status(Response.Status.NOT_FOUND).build();
        }

        User currentUser = getAuthenticatedUser();
        if (currentUser == null) return Response.status(Response.Status.UNAUTHORIZED).build();

        // Only owner or admin can view details
        if (!profile.userId.equals(currentUser.id) && !securityIdentity.hasRole(UserRole.ADMIN.name())) {
            return Response.status(Response.Status.FORBIDDEN).build();
        }

        return Response.ok(profile).build();
    }

    @POST
    @Transactional
    public Response create(VolunteerProfile profile) {
        User currentUser = getAuthenticatedUser();
        if (currentUser == null) return Response.status(Response.Status.UNAUTHORIZED).build();

        // Ensure user creates their own profile or is admin
        if (!profile.userId.equals(currentUser.id) && !securityIdentity.hasRole(UserRole.ADMIN.name())) {
             return Response.status(Response.Status.FORBIDDEN).build();
        }

        profile.persist();
        return Response.status(Response.Status.CREATED).entity(profile).build();
    }

    @PUT
    @Path("/{id}")
    @Transactional
    public Response update(@PathParam("id") UUID id, VolunteerProfile updatedProfile) {
        VolunteerProfile profile = VolunteerProfile.findById(id);
        if (profile == null) {
            return Response.status(Response.Status.NOT_FOUND).build();
        }

        User currentUser = getAuthenticatedUser();
        if (currentUser == null) return Response.status(Response.Status.UNAUTHORIZED).build();

        // Only owner or admin can update
        if (!profile.userId.equals(currentUser.id) && !securityIdentity.hasRole(UserRole.ADMIN.name())) {
            return Response.status(Response.Status.FORBIDDEN).build();
        }

        profile.availabilitySchedule = updatedProfile.availabilitySchedule;
        profile.serviceCategories = updatedProfile.serviceCategories;
        profile.constraints = updatedProfile.constraints;
        profile.maxTaskDistanceMeters = updatedProfile.maxTaskDistanceMeters;

        return Response.ok(profile).build();
    }

    @DELETE
    @Path("/{id}")
    @Transactional
    public Response delete(@PathParam("id") UUID id) {
        VolunteerProfile profile = VolunteerProfile.findById(id);
        if (profile == null) {
            return Response.status(Response.Status.NOT_FOUND).build();
        }

        User currentUser = getAuthenticatedUser();
        if (currentUser == null) return Response.status(Response.Status.UNAUTHORIZED).build();

        if (!profile.userId.equals(currentUser.id) && !securityIdentity.hasRole(UserRole.ADMIN.name())) {
            return Response.status(Response.Status.FORBIDDEN).build();
        }

        profile.delete();
        return Response.noContent().build();
    }
}
