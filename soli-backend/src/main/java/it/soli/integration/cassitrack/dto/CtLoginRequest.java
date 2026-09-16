package it.soli.integration.cassitrack.dto;

/** Body of {@code POST /api/v1/auth/login} (CT-01 on CassiTrack, OM-04 on OmniMove). */
public record CtLoginRequest(String email, String password) {
}
