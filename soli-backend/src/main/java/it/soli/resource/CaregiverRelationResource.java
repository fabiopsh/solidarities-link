package it.soli.resource;

import io.quarkus.security.identity.SecurityIdentity;
import it.soli.entity.User;
import it.soli.entity.UserRole;
import it.soli.entity.CaregiverRelation;
import jakarta.annotation.security.RolesAllowed;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.eclipse.microprofile.jwt.JsonWebToken;

import java.util.List;
import java.util.UUID;

@Path("/api/caregiver-relations")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class CaregiverRelationResource {

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
    public PaginatedResponse<CaregiverRelation> listAll(
            @QueryParam("page") @DefaultValue("0") int page,
            @QueryParam("size") @DefaultValue("20") int size) {
        return PaginatedResponse.of(CaregiverRelation.findAll().page(page, size));
    }

    @GET
    @Path("/{id}")
    public Response getById(@PathParam("id") UUID id) {
        CaregiverRelation relation = CaregiverRelation.findById(id);
        if (relation == null) {
            return Response.status(Response.Status.NOT_FOUND).build();
        }

        User currentUser = getAuthenticatedUser();
        if (currentUser == null) return Response.status(Response.Status.UNAUTHORIZED).build();

        if (!relation.caregiverId.equals(currentUser.id) && 
            !relation.beneficiaryId.equals(currentUser.id) && 
            !securityIdentity.hasRole(UserRole.ADMIN.name())) {
            return Response.status(Response.Status.FORBIDDEN).build();
        }

        return Response.ok(relation).build();
    }

    @POST
    @Transactional
    public Response create(CaregiverRelation relation) {
        User currentUser = getAuthenticatedUser();
        if (currentUser == null) return Response.status(Response.Status.UNAUTHORIZED).build();

        if (!relation.caregiverId.equals(currentUser.id) && !securityIdentity.hasRole(UserRole.ADMIN.name())) {
             return Response.status(Response.Status.FORBIDDEN).build();
        }

        relation.persist();
        return Response.status(Response.Status.CREATED).entity(relation).build();
    }

    @DELETE
    @Path("/{id}")
    @Transactional
    public Response delete(@PathParam("id") UUID id) {
        CaregiverRelation relation = CaregiverRelation.findById(id);
        if (relation == null) {
            return Response.status(Response.Status.NOT_FOUND).build();
        }

        User currentUser = getAuthenticatedUser();
        if (currentUser == null) return Response.status(Response.Status.UNAUTHORIZED).build();

        if (!relation.caregiverId.equals(currentUser.id) && !securityIdentity.hasRole(UserRole.ADMIN.name())) {
            return Response.status(Response.Status.FORBIDDEN).build();
        }

        relation.delete();
        return Response.noContent().build();
    }
}
