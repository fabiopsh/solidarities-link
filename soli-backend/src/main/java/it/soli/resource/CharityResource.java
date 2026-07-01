package it.soli.resource;

import it.soli.entity.Charity;
import it.soli.entity.Redemption;
import it.soli.entity.User;
import it.soli.service.WalletService;
import jakarta.annotation.security.RolesAllowed;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.eclipse.microprofile.jwt.JsonWebToken;

import java.util.Map;
import java.util.UUID;

@Path("/api/charities")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class CharityResource {

    @Inject
    JsonWebToken jwt;

    @Inject
    WalletService walletService;

    private User getAuthenticatedUser() {
        String keycloakId = jwt.getSubject();
        if (keycloakId == null) return null;
        return User.findByKeycloakId(keycloakId);
    }

    @GET
    public PaginatedResponse<Charity> listActive(
            @QueryParam("page") @DefaultValue("0") int page,
            @QueryParam("size") @DefaultValue("20") int size) {
        return PaginatedResponse.of(Charity.find("isActive", true).page(page, size));
    }

    @GET
    @Path("/my/redemptions")
    public Response getMyRedemptions(
            @QueryParam("page") @DefaultValue("0") int page,
            @QueryParam("size") @DefaultValue("20") int size) {
        User currentUser = getAuthenticatedUser();
        if (currentUser == null) return Response.status(Response.Status.UNAUTHORIZED).build();

        return Response.ok(PaginatedResponse.of(
                Redemption.find("userId", currentUser.id).page(page, size))).build();
    }

    @GET
    @Path("/{id}")
    public Response getById(@PathParam("id") UUID id) {
        Charity charity = Charity.findById(id);
        if (charity == null) {
            return Response.status(Response.Status.NOT_FOUND).build();
        }
        return Response.ok(charity).build();
    }

    @POST
    @Path("/{id}/redeem")
    public Response redeem(@PathParam("id") UUID id) {
        User currentUser = getAuthenticatedUser();
        if (currentUser == null) return Response.status(Response.Status.UNAUTHORIZED).build();

        try {
            Redemption redemption = walletService.redeemCharity(currentUser.id, id);
            return Response.ok(redemption).build();
        } catch (IllegalArgumentException e) {
            return Response.status(Response.Status.NOT_FOUND)
                    .entity(Map.of("error", e.getMessage())).build();
        } catch (IllegalStateException e) {
            return Response.status(Response.Status.CONFLICT)
                    .entity(Map.of("error", e.getMessage())).build();
        }
    }

    @POST
    @Transactional
    @RolesAllowed({"ADMIN"})
    public Response create(Charity charity) {
        charity.persist();
        return Response.status(Response.Status.CREATED).entity(charity).build();
    }

    @PUT
    @Path("/{id}")
    @Transactional
    @RolesAllowed({"ADMIN"})
    public Response update(@PathParam("id") UUID id, Charity updated) {
        Charity charity = Charity.findById(id);
        if (charity == null) {
            return Response.status(Response.Status.NOT_FOUND).build();
        }
        charity.name = updated.name;
        charity.description = updated.description;
        charity.cause = updated.cause;
        charity.voucherLabel = updated.voucherLabel;
        charity.costInCredits = updated.costInCredits;
        charity.stockRemaining = updated.stockRemaining;
        charity.isActive = updated.isActive;
        return Response.ok(charity).build();
    }

    @DELETE
    @Path("/{id}")
    @Transactional
    @RolesAllowed({"ADMIN"})
    public Response delete(@PathParam("id") UUID id) {
        Charity charity = Charity.findById(id);
        if (charity == null) {
            return Response.status(Response.Status.NOT_FOUND).build();
        }
        charity.delete();
        return Response.noContent().build();
    }
}
