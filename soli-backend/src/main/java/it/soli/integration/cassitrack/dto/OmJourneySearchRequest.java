package it.soli.integration.cassitrack.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;

/** Body of OM-11 {@code POST /api/v1/journeys/search}. */
public record OmJourneySearchRequest(
        @JsonProperty("origin_lat") double originLat,
        @JsonProperty("origin_lon") double originLon,
        @JsonProperty("origin_name") String originName,
        @JsonProperty("dest_lat") double destLat,
        @JsonProperty("dest_lon") double destLon,
        @JsonProperty("dest_name") String destName,
        @JsonProperty("origin_stop_id") String originStopId,
        @JsonProperty("dest_stop_id") String destStopId,
        @JsonProperty("modes") List<String> modes) {
}
