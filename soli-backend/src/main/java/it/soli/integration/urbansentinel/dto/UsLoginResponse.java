package it.soli.integration.urbansentinel.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

/** 200 OK of {@code POST /api/v1/auth/login}: JWT + profile; the refresh token travels in {@code refresh_token_cookie}. */
public record UsLoginResponse(
        @JsonProperty("access_token") String accessToken,
        @JsonProperty("token_type") String tokenType,
        @JsonProperty("expires_in") long expiresIn,
        @JsonProperty("user") UsUser user) {

    public record UsUser(String id, String username, String role, @JsonProperty("assigned_buildings") int assignedBuildings) {
    }
}
