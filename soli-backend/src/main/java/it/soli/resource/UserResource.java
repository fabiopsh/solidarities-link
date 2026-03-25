package it.soli.resource;

import io.quarkus.security.identity.SecurityIdentity;
import it.soli.entity.User;
import it.soli.entity.UserRole;
import it.soli.entity.VolunteerProfile;
import it.soli.entity.ProfileImage;
import jakarta.annotation.security.RolesAllowed;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.eclipse.microprofile.jwt.JsonWebToken;

import java.util.List;
import java.util.UUID;

@Path("/api/users")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class UserResource {

    @Inject
    SecurityIdentity securityIdentity;

    @Inject
    JsonWebToken jwt;

    public static class LocationUpdateDto {
        public Double latitude;
        public Double longitude;
    }

    public static class BasicUserDto {
        public UUID id;
        public String firstName;
        public String lastName;

        public BasicUserDto(UUID id, String firstName, String lastName) {
            this.id = id;
            this.firstName = firstName;
            this.lastName = lastName;
        }
    }

    /**
     * PUT /api/users/me/location - Update user's geolocation silently
     */
    @PUT
    @Path("/me/location")
    @Transactional
    public Response updateLocation(LocationUpdateDto location) {
        if (jwt.getSubject() == null) {
            return Response.status(Response.Status.UNAUTHORIZED).build();
        }

        User user = User.findByKeycloakId(jwt.getSubject());
        if (user == null) {
            return Response.status(Response.Status.NOT_FOUND).build();
        }

        VolunteerProfile profile = VolunteerProfile.findByUserId(user.id);
        if (profile != null) {
            profile.latitude = location.latitude;
            profile.longitude = location.longitude;
            return Response.ok().build();
        }

        return Response.status(Response.Status.NOT_FOUND).entity("Volunteer profile not found").build();
    }

    /**
     * GET /api/users/me - Get current user profile from OIDC token.
     * Auto-creates the user in DB on first login.
     */
    @GET
    @Path("/me")
    public Response getCurrentUser() {
        if (jwt.getSubject() == null) {
            return Response.status(Response.Status.UNAUTHORIZED).build();
        }
        
        User user = User.findByKeycloakId(jwt.getSubject());
        if (user == null) {
            return Response.status(Response.Status.NOT_FOUND).build();
        }

        return Response.ok(user).build();
    }

    /**
     * PUT /api/users/me/notifications-read - Mark notifications as read
     */
    @PUT
    @Path("/me/notifications-read")
    @Transactional
    public Response markNotificationsRead() {
        if (jwt.getSubject() == null) {
            return Response.status(Response.Status.UNAUTHORIZED).build();
        }
        User user = User.findByKeycloakId(jwt.getSubject());
        if (user == null) {
            return Response.status(Response.Status.NOT_FOUND).build();
        }
        user.notificationsReadAt = java.time.LocalDateTime.now();
        return Response.ok().build();
    }

    /**
     * GET /api/users - List all users.
     */
    @GET
    @RolesAllowed({"ADMIN"})
    public PaginatedResponse<User> listAll(
            @QueryParam("page") @DefaultValue("0") int page,
            @QueryParam("size") @DefaultValue("20") int size) {
        return PaginatedResponse.of(User.findAll().page(page, size));
    }

    /**
     * GET /api/users/{id} - Get user by ID.
     */
    @GET
    @Path("/{id}")
    public Response getById(@PathParam("id") UUID id) {
        User user = User.findById(id);
        if (user == null) {
            return Response.status(Response.Status.NOT_FOUND).build();
        }
        
        // Security check: Only the user themselves or an ADMIN can view the profile
        if (!jwt.getSubject().equals(user.keycloakId) && !securityIdentity.hasRole(UserRole.ADMIN.name())) {
            return Response.status(Response.Status.FORBIDDEN).build();
        }
        
        return Response.ok(user).build();
    }

    /**
     * GET /api/users/{id}/basic - Get basic user info (name) for other users.
     */
    @GET
    @Path("/{id}/basic")
    public Response getBasicById(@PathParam("id") UUID id) {
        if (jwt.getSubject() == null) {
            return Response.status(Response.Status.UNAUTHORIZED).build();
        }
        User user = User.findById(id);
        if (user == null) {
            return Response.status(Response.Status.NOT_FOUND).build();
        }
        return Response.ok(new BasicUserDto(user.id, user.firstName, user.lastName)).build();
    }

    /**
     * POST /api/users - Create a new user (usually done via /me, this is for ADMIN).
     */
    @POST
    @Transactional
    @RolesAllowed({"ADMIN"})
    public Response create(User user) {
        user.persist();
        return Response.status(Response.Status.CREATED).entity(user).build();
    }

    /**
     * PUT /api/users/{id} - Update user.
     */
    @PUT
    @Path("/{id}")
    @Transactional
    public Response update(@PathParam("id") UUID id, User updatedUser) {
        User user = User.findById(id);
        if (user == null) {
            return Response.status(Response.Status.NOT_FOUND).build();
        }
        
        // Security check: Only the user themselves or an ADMIN can update the profile
        if (!jwt.getSubject().equals(user.keycloakId) && !securityIdentity.hasRole(UserRole.ADMIN.name())) {
            return Response.status(Response.Status.FORBIDDEN).build();
        }

        user.firstName = updatedUser.firstName;
        user.lastName = updatedUser.lastName;
        user.email = updatedUser.email;
        user.fiscalCode = updatedUser.fiscalCode;
        
        // Only ADMIN can change roles, status, or certification level
        if (securityIdentity.hasRole(UserRole.ADMIN.name())) {
            user.role = updatedUser.role;
            user.status = updatedUser.status;
            user.certificationLevel = updatedUser.certificationLevel;
        }

        return Response.ok(user).build();
    }

    /**
     * DELETE /api/users/{id} - Delete user.
     */
    @DELETE
    @Path("/{id}")
    @Transactional
    public Response delete(@PathParam("id") UUID id) {
        User user = User.findById(id);
        if (user == null) {
            return Response.status(Response.Status.NOT_FOUND).build();
        }
        
        // Security check: Only the user themselves or an ADMIN can delete the profile
        if (!jwt.getSubject().equals(user.keycloakId) && !securityIdentity.hasRole(UserRole.ADMIN.name())) {
            return Response.status(Response.Status.FORBIDDEN).build();
        }
        
        user.delete();
        return Response.noContent().build();
    }

    /**
     * PUT /api/users/me/profile-picture - Upload profile picture
     */
    @PUT
    @Path("/me/profile-picture")
    @Consumes(MediaType.MULTIPART_FORM_DATA)
    @Transactional
    public Response uploadProfilePicture(
            @org.jboss.resteasy.reactive.RestForm("image") org.jboss.resteasy.reactive.multipart.FileUpload fileUpload) {
        
        if (jwt.getSubject() == null) {
            return Response.status(Response.Status.UNAUTHORIZED).build();
        }

        User user = User.findByKeycloakId(jwt.getSubject());
        if (user == null) {
            return Response.status(Response.Status.NOT_FOUND).build();
        }

        if (fileUpload == null) {
            return Response.status(Response.Status.BAD_REQUEST).entity("No image provided").build();
        }

        try {
            byte[] fileBytes = java.nio.file.Files.readAllBytes(fileUpload.uploadedFile());
            String contentType = fileUpload.contentType();
            if (contentType == null) {
                contentType = "application/octet-stream";
            }

            ProfileImage image = ProfileImage.findByUserId(user.id);
            if (image == null) {
                image = new ProfileImage();
                image.id = UUID.randomUUID();
                image.userId = user.id;
            }
            image.data = fileBytes;
            image.contentType = contentType;
            image.persist();

            return Response.ok().build();
        } catch (java.io.IOException e) {
            return Response.serverError().build();
        }
    }

    /**
     * GET /api/users/me/profile-picture - Get current user's profile picture
     */
    @GET
    @Path("/me/profile-picture")
    public Response getMyProfilePicture() {
        if (jwt.getSubject() == null) {
            return Response.status(Response.Status.UNAUTHORIZED).build();
        }
        User user = User.findByKeycloakId(jwt.getSubject());
        if (user == null) {
            return Response.status(Response.Status.NOT_FOUND).build();
        }
        ProfileImage image = ProfileImage.findByUserId(user.id);
        if (image == null || image.data == null) {
            return Response.noContent().build();
        }
        return Response.ok(image.data).type(image.contentType).build();
    }

    /**
     * GET /api/users/{id}/profile-picture - Get profile picture
     */
    @GET
    @Path("/{id}/profile-picture")
    public Response getProfilePicture(@PathParam("id") UUID id) {
        if (jwt.getSubject() == null) {
            return Response.status(Response.Status.UNAUTHORIZED).build();
        }

        ProfileImage image = ProfileImage.findByUserId(id);
        if (image == null || image.data == null) {
            return Response.noContent().build();
        }

        return Response.ok(image.data).type(image.contentType).build();
    }
}
