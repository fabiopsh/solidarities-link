package it.soli.resource;

import io.quarkus.security.identity.SecurityIdentity;
import it.soli.entity.User;
import it.soli.entity.UserRole;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.eclipse.microprofile.jwt.JsonWebToken;

import java.util.List;

@Path("/api/users")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class UserResource {

    @Inject
    SecurityIdentity securityIdentity;

    @Inject
    JsonWebToken jwt;

    /**
     * GET /api/users/me - Get current user profile from OIDC token.
     * Auto-creates the user in DB on first login.
     */
    @GET
    @Path("/me")
    @Transactional
    public Response getCurrentUser() {
        String keycloakId = jwt.getSubject();
        User user = User.findByKeycloakId(keycloakId);

        if (user == null) {
            // First login: create user from token claims
            user = new User();
            user.keycloakId = keycloakId;
            user.email = jwt.getClaim("email");
            user.firstName = jwt.getClaim("given_name");
            user.lastName = jwt.getClaim("family_name");
            user.role = UserRole.REQUESTER;
            user.persist();
        }

        return Response.ok(user).build();
    }

    /**
     * GET /api/users - List all users.
     */
    @GET
    public List<User> listAll() {
        return User.listAll();
    }

    /**
     * GET /api/users/{id} - Get user by ID.
     */
    @GET
    @Path("/{id}")
    public Response getById(@PathParam("id") Long id) {
        User user = User.findById(id);
        if (user == null) {
            return Response.status(Response.Status.NOT_FOUND).build();
        }
        return Response.ok(user).build();
    }

    /**
     * POST /api/users - Create a new user.
     */
    @POST
    @Transactional
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
    public Response update(@PathParam("id") Long id, User updatedUser) {
        User user = User.findById(id);
        if (user == null) {
            return Response.status(Response.Status.NOT_FOUND).build();
        }
        user.firstName = updatedUser.firstName;
        user.lastName = updatedUser.lastName;
        user.email = updatedUser.email;
        user.role = updatedUser.role;
        return Response.ok(user).build();
    }

    /**
     * DELETE /api/users/{id} - Delete user.
     */
    @DELETE
    @Path("/{id}")
    @Transactional
    public Response delete(@PathParam("id") Long id) {
        User user = User.findById(id);
        if (user == null) {
            return Response.status(Response.Status.NOT_FOUND).build();
        }
        user.delete();
        return Response.noContent().build();
    }
}
