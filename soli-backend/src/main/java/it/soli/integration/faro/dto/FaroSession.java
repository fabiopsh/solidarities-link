package it.soli.integration.faro.dto;

/** Response of FARO {@code POST /api/users/{id}/sessions} (200 OK): JWT issued by the Gestore Autenticazione. */
public record FaroSession(String token, String tokenType, long expiresIn) {
}
