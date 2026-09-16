package it.soli.integration.faro.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * Message published by FARO's Gestore Rilevamento Eventi on the "Stream eventi" topic
 * (model "Event" of FARO's message data model, snake_case JSON).
 */
public record FaroStreamEvent(
        @JsonProperty("event_id") String eventId,
        @JsonProperty("timestamp") String timestamp,
        @JsonProperty("emergency_category") String emergencyCategory,
        @JsonProperty("severity") String severity,
        @JsonProperty("incident_context") IncidentContext incidentContext,
        @JsonProperty("coordinates") Coordinates coordinates,
        @JsonProperty("address") String address,
        @JsonProperty("global_confidence") Double globalConfidence) {

    public record IncidentContext(
            @JsonProperty("has_injured") boolean hasInjured,
            @JsonProperty("has_unconscious") boolean hasUnconscious,
            @JsonProperty("has_trapped") boolean hasTrapped,
            @JsonProperty("has_special_vehicle_involved") boolean hasSpecialVehicleInvolved) {
    }

    public record Coordinates(Double latitude, Double longitude) {
    }
}
