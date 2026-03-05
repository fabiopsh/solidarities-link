package it.soli.resource;

import io.quarkus.security.identity.SecurityIdentity;
import it.soli.entity.User;
import it.soli.entity.UserRole;
import it.soli.entity.Wallet;
import it.soli.entity.Transaction;
import jakarta.annotation.security.RolesAllowed;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.eclipse.microprofile.jwt.JsonWebToken;

import java.util.List;
import java.util.UUID;

@Path("/api/wallets")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class WalletResource {

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
    public PaginatedResponse<Wallet> listAll(
            @QueryParam("page") @DefaultValue("0") int page,
            @QueryParam("size") @DefaultValue("20") int size) {
        return PaginatedResponse.of(Wallet.findAll().page(page, size));
    }

    @GET
    @Path("/my")
    public Response getMyWallet() {
        User currentUser = getAuthenticatedUser();
        if (currentUser == null) return Response.status(Response.Status.UNAUTHORIZED).build();

        Wallet wallet = Wallet.find("userId", currentUser.id).firstResult();
        if (wallet == null) {
            return Response.status(Response.Status.NOT_FOUND).build();
        }
        return Response.ok(wallet).build();
    }

    @GET
    @Path("/{id}")
    @RolesAllowed({"ADMIN"}) // Only ADMIN can get arbitrary wallets by ID, users use /my
    public Response getById(@PathParam("id") UUID id) {
        Wallet wallet = Wallet.findById(id);
        if (wallet == null) {
            return Response.status(Response.Status.NOT_FOUND).build();
        }
        return Response.ok(wallet).build();
    }

    @GET
    @Path("/my/transactions")
    public Response getMyTransactions(
            @QueryParam("page") @DefaultValue("0") int page,
            @QueryParam("size") @DefaultValue("20") int size) {
        User currentUser = getAuthenticatedUser();
        if (currentUser == null) return Response.status(Response.Status.UNAUTHORIZED).build();

        Wallet wallet = Wallet.find("userId", currentUser.id).firstResult();
        if (wallet == null) {
            return Response.status(Response.Status.NOT_FOUND).entity("Wallet not found").build();
        }

        return Response.ok(PaginatedResponse.of(Transaction.find("walletId", wallet.id).page(page, size))).build();
    }
}
