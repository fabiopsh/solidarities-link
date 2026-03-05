package it.soli.resource;

import it.soli.service.MockAIService;
import jakarta.inject.Inject;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

@Path("/api/assistant")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class AssistantResource {

    @Inject
    MockAIService mockAIService;

    public static class ExtractionRequest {
        public String text;
    }

    @POST
    @Path("/extract")
    public Response extract(ExtractionRequest payload) {
        if (payload == null || payload.text == null || payload.text.isBlank()) {
            return Response.status(Response.Status.BAD_REQUEST).entity("Text is required").build();
        }

        MockAIService.IntentExtractionResult result = mockAIService.extractIntent(payload.text);
        return Response.ok(result).build();
    }
}
