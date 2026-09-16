package it.soli.integration.faro.dto;

/** Body of FARO {@code POST /api/users} and {@code POST /api/users/{id}/sessions}. */
public record FaroCredentials(String username, String password) {
}
