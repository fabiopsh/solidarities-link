package it.soli.integration.cassitrack.dto;

/** JWT delivered as HttpOnly cookie ({@code cassitrack_jwt} / {@code omnimove_jwt}), replayed on protected calls. */
public record CtSession(String cookieName, String token) {
}
