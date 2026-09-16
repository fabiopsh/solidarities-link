package it.soli.integration.urbansentinel.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

/** Item of {@code GET /api/v1/earthquakes} (INGV event as stored by Urban Sentinel). */
public record UsEarthquake(
        @JsonProperty("depth") double depth,
        @JsonProperty("geo_info") GeoInfo geoInfo,
        @JsonProperty("id") String id,
        @JsonProperty("latitude") double latitude,
        @JsonProperty("longitude") double longitude,
        @JsonProperty("magnitude") double magnitude,
        @JsonProperty("occurred_at") String occurredAt) {

    public record GeoInfo(
            @JsonProperty("city") String city,
            @JsonProperty("country") String country,
            @JsonProperty("country_code") String countryCode,
            @JsonProperty("formatted_address") String formattedAddress,
            @JsonProperty("postcode") String postcode,
            @JsonProperty("province") String province,
            @JsonProperty("region") String region,
            @JsonProperty("suburb") String suburb) {
    }
}
