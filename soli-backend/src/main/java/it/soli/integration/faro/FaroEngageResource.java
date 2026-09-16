package it.soli.integration.faro;

import it.soli.integration.faro.dto.FaroEngageRequest;
import jakarta.inject.Inject;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Map;

/**
 * Engage endpoint declared by SOLI in FARO's service registry and invoked by FARO's Binder.
 * POC authentication: pre-shared key in X-API-Key. Target (FR-22): OAuth2 client credentials
 * with a dedicated Keycloak client for FARO.
 */
@Path(FaroEngageHandler.ENGAGE_PATH)
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class FaroEngageResource {

    @Inject
    FaroEngageHandler handler;

    @Inject
    FaroConfig config;

    @POST
    public Response engage(@HeaderParam("X-API-Key") String apiKey, FaroEngageRequest request) {
        if (!config.enabled()) {
            return Response.status(Response.Status.SERVICE_UNAVAILABLE)
                    .entity(Map.of("error", "Integrazione FARO disabilitata")).build();
        }
        if (apiKey == null || !MessageDigest.isEqual(
                apiKey.getBytes(StandardCharsets.UTF_8), config.engageApiKey().getBytes(StandardCharsets.UTF_8))) {
            return Response.status(Response.Status.UNAUTHORIZED)
                    .entity(Map.of("error", "X-API-Key mancante o non valida")).build();
        }
        FaroEngageHandler.Outcome outcome = handler.handle(request);
        Response.ResponseBuilder builder = Response.status(outcome.status()).entity(outcome.body());
        if (outcome.status() == 503) {
            builder.header("Retry-After", "120");
        }
        return builder.build();
    }
}
