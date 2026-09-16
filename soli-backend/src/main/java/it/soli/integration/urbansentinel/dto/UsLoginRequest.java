package it.soli.integration.urbansentinel.dto;

/** Body of Urban Sentinel {@code POST /api/v1/auth/login}. */
public record UsLoginRequest(String username, String password) {
}
