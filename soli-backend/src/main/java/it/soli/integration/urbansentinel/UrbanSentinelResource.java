package it.soli.integration.urbansentinel;

import it.soli.integration.urbansentinel.dto.UsApiException;
import jakarta.inject.Inject;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

import java.util.List;
import java.util.Map;

/** Post-earthquake overlay for the SOLI map, backed by Urban Sentinel. Authenticated SOLI users. */
@Path("/api/integrations/urban-sentinel")
@Produces(MediaType.APPLICATION_JSON)
public class UrbanSentinelResource {

    @Inject
    SeismicOverlayService overlayService;

    @Inject
    UrbanSentinelConfig config;

    /** Recent earthquakes (magnitude above the configured minimum), newest first. */
    @GET
    @Path("/earthquakes")
    public Response earthquakes() {
        if (!config.enabled()) {
            return Response.ok(List.of()).build();
        }
        try {
            return Response.ok(overlayService.recentEvents()).build();
        } catch (UsApiException e) {
            return unavailable(e);
        }
    }

    /** Epicentre, affected area and monitored buildings weighted by damage KPIs for one event. */
    @GET
    @Path("/earthquakes/{id}/overlay")
    public Response overlay(@PathParam("id") String id) {
        if (!config.enabled()) {
            return Response.status(Response.Status.SERVICE_UNAVAILABLE).entity(Map.of("error", "Integrazione Urban Sentinel disabilitata")).build();
        }
        try {
            return overlayService.overlay(id)
                    .map(o -> Response.ok(o).build())
                    .orElse(Response.status(Response.Status.NOT_FOUND).entity(Map.of("error", "Evento sismico non trovato")).build());
        } catch (UsApiException e) {
            return unavailable(e);
        }
    }

    private static Response unavailable(UsApiException e) {
        return Response.status(Response.Status.BAD_GATEWAY)
                .entity(Map.of("error", "Urban Sentinel non disponibile: " + e.getMessage(), "urbanSentinelStatus", e.status))
                .build();
    }
}
