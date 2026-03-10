package it.soli.websocket;

import io.quarkus.websockets.next.OnClose;
import io.quarkus.websockets.next.OnTextMessage;
import io.quarkus.websockets.next.OnOpen;
import io.quarkus.websockets.next.WebSocket;
import io.quarkus.websockets.next.WebSocketConnection;
import io.quarkus.websockets.next.HandshakeRequest;
import io.vertx.core.json.JsonObject;
import it.soli.entity.ChatMessage;
import it.soli.entity.ChatSession;
import it.soli.entity.User;
import it.soli.service.MockAIService;

import jakarta.inject.Inject;
import jakarta.transaction.Transactional;

import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

@WebSocket(path = "/chat/{taskId}")
public class ChatWebSocket {

    @Inject
    MockAIService mockAIService;

    // Connessioni attive per stanza (taskId)
    private static final Map<String, List<WebSocketConnection>> connections = new ConcurrentHashMap<>();

    // Associa ogni connessione al suo utente autenticato
    private static final Map<String, User> connectionUsers = new ConcurrentHashMap<>();

    @OnOpen
    @Transactional
    public void onOpen(WebSocketConnection connection) {
        String taskIdStr = connection.pathParam("taskId");
        
        HandshakeRequest request = connection.handshakeRequest();
        String query = request.query();
        String token = null;
        if (query != null && query.contains("token=")) {
            for (String param : query.split("&")) {
                if (param.startsWith("token=")) {
                    token = URLDecoder.decode(param.substring(6), StandardCharsets.UTF_8);
                    break;
                }
            }
        }
        if (token == null || token.isEmpty()) {
            connection.sendTextAndAwait(new JsonObject().put("error", "Authentication failed, no token provided").encode());
            connection.close();
            return;
        }

        try {
            // Decode JWT payload completely manually (Base64) to get the "sub" claim
            String[] parts = token.split("\\.");
            if (parts.length < 2) throw new RuntimeException("Invalid JWT format");
            
            String payload = new String(Base64.getUrlDecoder().decode(parts[1]));
            JsonObject json = new JsonObject(payload);
            String keycloakId = json.getString("sub");
            
            System.out.println("[ChatWS] Decoded keycloakId from JWT: " + keycloakId);
            
            User user = User.findByKeycloakId(keycloakId);
            System.out.println("[ChatWS] User found: " + (user != null ? user.id + " / " + user.email : "NULL"));
            
            if (user == null) {
                connection.sendTextAndAwait(new JsonObject().put("error", "User not found in DB for keycloakId: " + keycloakId).encode());
                connection.close();
                return;
            }
            
            // Registra utente e connessione
            connectionUsers.put(connection.id(), user);
            connections.computeIfAbsent(taskIdStr, k -> new CopyOnWriteArrayList<>()).add(connection);

        } catch (Exception e) {
            e.printStackTrace();
            connection.sendTextAndAwait(new JsonObject().put("error", "Invalid token: " + e.getMessage()).encode());
            connection.close();
        }
    }

    @OnTextMessage
    @Transactional
    public void onMessage(String message, WebSocketConnection connection) {
        String taskIdStr = connection.pathParam("taskId");
        User sender = connectionUsers.get(connection.id());
        
        if (sender == null) {
            connection.sendTextAndAwait(new JsonObject().put("error", "Not authenticated").encode());
            return;
        }

        JsonObject incoming;
        try {
            incoming = new JsonObject(message);
        } catch (Exception e) {
            return; // Ignore invalid JSON
        }

        String content = incoming.getString("content");
        if (content == null || content.trim().isEmpty()) return;

        // Check policy
        if (!mockAIService.isMessageSafe(content)) {
            connection.sendTextAndAwait(new JsonObject().put("error", "Messaggio bloccato per policy compliance").encode());
            return;
        }

        // Find session
        ChatSession session = ChatSession.find("taskId", UUID.fromString(taskIdStr)).firstResult();
        if (session == null || !session.isActive) {
            connection.sendTextAndAwait(new JsonObject().put("error", "Sessione chat inesistente o inattiva").encode());
            return;
        }

        // Persistence
        ChatMessage chatMessage = new ChatMessage();
        chatMessage.chatSessionId = session.id;
        chatMessage.senderId = sender.id;
        chatMessage.content = content;
        chatMessage.persist();

        // Broadcast to all in the same task
        JsonObject outgoing = new JsonObject()
            .put("id", chatMessage.id.toString())
            .put("content", chatMessage.content)
            .put("senderId", chatMessage.senderId.toString())
            .put("createdAt", chatMessage.sentAt.toString());

        String outgoingStr = outgoing.encode();
        List<WebSocketConnection> taskConns = connections.get(taskIdStr);
        if (taskConns != null) {
            for (WebSocketConnection conn : taskConns) {
                try {
                    conn.sendTextAndAwait(outgoingStr);
                } catch (Exception ignored) {
                }
            }
        }
    }

    @OnClose
    public void onClose(WebSocketConnection connection) {
        String taskIdStr = connection.pathParam("taskId");
        connectionUsers.remove(connection.id());
        
        List<WebSocketConnection> taskConns = connections.get(taskIdStr);
        if (taskConns != null) {
            taskConns.remove(connection);
            if (taskConns.isEmpty()) {
                connections.remove(taskIdStr);
            }
        }
    }
}
