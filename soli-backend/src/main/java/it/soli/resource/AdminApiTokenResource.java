package it.soli.resource;

import it.soli.entity.ApiToken;
import it.soli.entity.User;
import it.soli.service.ApiTokenService;
import jakarta.annotation.security.RolesAllowed;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.eclipse.microprofile.jwt.JsonWebToken;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Admin-only management of Open Data API tokens.
 */
@Path("/api/admin/tokens")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@RolesAllowed({"ADMIN"})
public class AdminApiTokenResource {

    @Inject
    JsonWebToken jwt;

    @Inject
    ApiTokenService apiTokenService;

    // ---- DTOs -------------------------------------------------------------
    public static class TokenView {
        public UUID id;
        public String label;
        public String tokenPrefix;
        public String scope;
        public LocalDateTime createdAt;
        public LocalDateTime expiresAt;
        public LocalDateTime lastUsedAt;
        public boolean revoked;
        public long callCount;
        public boolean expired;

        static TokenView of(ApiToken t) {
            TokenView v = new TokenView();
            v.id = t.id;
            v.label = t.label;
            v.tokenPrefix = t.tokenPrefix;
            v.scope = t.scope;
            v.createdAt = t.createdAt;
            v.expiresAt = t.expiresAt;
            v.lastUsedAt = t.lastUsedAt;
            v.revoked = Boolean.TRUE.equals(t.revoked);
            v.callCount = t.callCount == null ? 0L : t.callCount;
            v.expired = t.expiresAt != null && t.expiresAt.isBefore(LocalDateTime.now());
            return v;
        }
    }

    public static class CreateTokenRequest {
        public String label;
        public LocalDateTime expiresAt;
    }

    public static class CreatedTokenView extends TokenView {
        // Plaintext key, returned ONLY once at creation.
        public String key;
    }

    // ---- Endpoints --------------------------------------------------------
    @GET
    public List<TokenView> list() {
        return ApiToken.<ApiToken>listAll().stream().map(TokenView::of).collect(Collectors.toList());
    }

    @POST
    public Response create(CreateTokenRequest req) {
        if (req == null || req.label == null || req.label.isBlank()) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity(java.util.Map.of("error", "label is required")).build();
        }
        if (req.expiresAt == null || req.expiresAt.isBefore(LocalDateTime.now())) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity(java.util.Map.of("error", "expiresAt is required and must be in the future")).build();
        }
        User admin = User.findByKeycloakId(jwt.getSubject());
        ApiTokenService.CreatedToken created =
                apiTokenService.create(req.label.trim(), req.expiresAt, admin != null ? admin.id : null);

        CreatedTokenView view = new CreatedTokenView();
        ApiToken t = created.token;
        view.id = t.id;
        view.label = t.label;
        view.tokenPrefix = t.tokenPrefix;
        view.scope = t.scope;
        view.createdAt = t.createdAt;
        view.expiresAt = t.expiresAt;
        view.revoked = false;
        view.callCount = 0L;
        view.expired = false;
        view.key = created.plaintextKey;
        return Response.status(Response.Status.CREATED).entity(view).build();
    }

    @POST
    @Path("/{id}/revoke")
    public Response revoke(@PathParam("id") UUID id) {
        return apiTokenService.revoke(id)
                ? Response.ok(java.util.Map.of("revoked", true)).build()
                : Response.status(Response.Status.NOT_FOUND).build();
    }

    @DELETE
    @Path("/{id}")
    @Transactional
    public Response delete(@PathParam("id") UUID id) {
        ApiToken t = ApiToken.findById(id);
        if (t == null) {
            return Response.status(Response.Status.NOT_FOUND).build();
        }
        t.delete();
        return Response.noContent().build();
    }
}
