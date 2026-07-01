package it.soli.resource;

import it.soli.entity.UserRole;
import it.soli.service.ApiTokenService;
import jakarta.inject.Inject;
import jakarta.ws.rs.container.ContainerRequestContext;
import jakarta.ws.rs.container.ContainerRequestFilter;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.ext.Provider;

import java.util.Map;

/**
 * Gates the public Open Data endpoints (/api/open/**), which are permitted at
 * the HTTP policy level and therefore skip OIDC. Access requires either:
 *   - a valid X-API-Key header (an issued, non-revoked, non-expired ApiToken), or
 *   - an authenticated ADMIN (so the admin dashboard can preview stats with its JWT).
 * Otherwise the request is rejected with 401.
 */
@Provider
public class OpenDataApiKeyFilter implements ContainerRequestFilter {

    @Inject
    ApiTokenService apiTokenService;

    @Override
    public void filter(ContainerRequestContext ctx) {
        String path = ctx.getUriInfo().getPath();
        if (path == null) return;
        String normalized = path.startsWith("/") ? path.substring(1) : path;
        if (!normalized.startsWith("api/open")) {
            return; // not an Open Data endpoint
        }

        String apiKey = ctx.getHeaderString("X-API-Key");
        if (apiKey != null && apiTokenService.validateAndRecord(apiKey)) {
            return; // valid API key
        }

        if (ctx.getSecurityContext() != null && ctx.getSecurityContext().isUserInRole(UserRole.ADMIN.name())) {
            return; // admin JWT (dashboard preview)
        }

        ctx.abortWith(Response.status(Response.Status.UNAUTHORIZED)
                .type(MediaType.APPLICATION_JSON)
                .entity(Map.of("error", "Missing or invalid X-API-Key. Request a token from the administrator."))
                .build());
    }
}
