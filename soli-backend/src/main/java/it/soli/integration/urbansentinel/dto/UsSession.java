package it.soli.integration.urbansentinel.dto;

/** Credentials to present on protected calls: {@code Authorization: Bearer} + {@code Cookie: refresh_token_cookie}. */
public record UsSession(String accessToken, String refreshCookie) {
}
