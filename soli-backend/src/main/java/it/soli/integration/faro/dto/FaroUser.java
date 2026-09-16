package it.soli.integration.faro.dto;

/** Response of FARO {@code POST /api/users} (201 Created). */
public record FaroUser(Long id, String username) {
}
