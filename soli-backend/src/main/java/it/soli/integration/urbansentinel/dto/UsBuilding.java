package it.soli.integration.urbansentinel.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;

/** Item of {@code GET /api/v1/buildings}: registry data, coordinates and sensors. */
public record UsBuilding(
        @JsonProperty("id") String id,
        @JsonProperty("name") String name,
        @JsonProperty("building_type") String buildingType,
        @JsonProperty("address") String address,
        @JsonProperty("city") String city,
        @JsonProperty("latitude") double latitude,
        @JsonProperty("longitude") double longitude,
        @JsonProperty("construction_year") int constructionYear,
        @JsonProperty("structure_type") String structureType,
        @JsonProperty("floors") int floors,
        @JsonProperty("occupants") int occupants,
        @JsonProperty("health_status") String healthStatus,
        @JsonProperty("sensors") List<Sensor> sensors) {

    public record Sensor(@JsonProperty("id") String id, @JsonProperty("name") String name, @JsonProperty("floor") int floor) {
    }
}
