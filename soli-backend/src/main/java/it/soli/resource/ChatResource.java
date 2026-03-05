package it.soli.resource;

import io.quarkus.security.identity.SecurityIdentity;
import it.soli.entity.User;
import it.soli.entity.UserRole;
import it.soli.entity.ChatSession;
import it.soli.entity.ChatMessage;
import jakarta.annotation.security.RolesAllowed;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.eclipse.microprofile.jwt.JsonWebToken;

import java.util.List;
import java.util.UUID;

@Path("/api/chat")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class ChatResource {

    @Inject
    SecurityIdentity securityIdentity;

    @Inject
    JsonWebToken jwt;

    @Inject
    it.soli.service.MockAIService mockAIService;

    private User getAuthenticatedUser() {
        String keycloakId = jwt.getSubject();
        if (keycloakId == null) return null;
        return User.findByKeycloakId(keycloakId);
    }

    @GET
    @Path("/sessions/task/{taskId}")
    public Response getSessionByTask(@PathParam("taskId") UUID taskId) {
        ChatSession session = ChatSession.find("taskId", taskId).firstResult();
        if (session == null) {
             return Response.status(Response.Status.NOT_FOUND).build();
        }
        // In a real app we'd check if the user is part of this task.
        return Response.ok(session).build();
    }

    @GET
    @Path("/sessions/{sessionId}/messages")
    public Response getMessages(
            @PathParam("sessionId") UUID sessionId,
            @QueryParam("page") @DefaultValue("0") int page,
            @QueryParam("size") @DefaultValue("20") int size) {
        ChatSession session = ChatSession.findById(sessionId);
        if (session == null) {
             return Response.status(Response.Status.NOT_FOUND).build();
        }
        
        return Response.ok(PaginatedResponse.of(ChatMessage.find("chatSessionId", sessionId).page(page, size))).build();
    }

    @POST
    @Path("/sessions/{sessionId}/messages")
    @Transactional
    public Response sendMessage(@PathParam("sessionId") UUID sessionId, ChatMessage message) {
        ChatSession session = ChatSession.findById(sessionId);
        if (session == null || !session.isActive) {
             return Response.status(Response.Status.BAD_REQUEST).entity("Session not found or inactive").build();
        }

        User currentUser = getAuthenticatedUser();
        if (currentUser == null) return Response.status(Response.Status.UNAUTHORIZED).build();

        if (!mockAIService.isMessageSafe(message.content)) {
            // "Messaggio bloccato per policy compliance".
            return Response.status(Response.Status.BAD_REQUEST).entity(new ErrorResponse("Messaggio bloccato per policy compliance")).build();
        }

        message.chatSessionId = sessionId;
        message.senderId = currentUser.id;
        message.persist();

        return Response.status(Response.Status.CREATED).entity(message).build();
    }

    public static class ErrorResponse {
        public String error;
        public ErrorResponse(String error) { this.error = error; }
    }
}
