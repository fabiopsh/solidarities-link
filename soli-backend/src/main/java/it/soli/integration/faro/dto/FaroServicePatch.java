package it.soli.integration.faro.dto;

/** Body of FARO {@code PATCH /api/services/{id}} (heartbeat, FR13). */
public record FaroServicePatch(String status, Double avgLatency, Double currentLoad) {
}
