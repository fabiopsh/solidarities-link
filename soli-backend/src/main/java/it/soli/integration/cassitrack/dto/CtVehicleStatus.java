package it.soli.integration.cassitrack.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

/** Item of CT-03 {@code GET /api/v1/vehicles} (VehicleStatusDTO), also returned by CT-04. */
public record CtVehicleStatus(
        @JsonProperty("vehicle_id") String vehicleId,
        @JsonProperty("lat") double lat,
        @JsonProperty("lon") double lon,
        @JsonProperty("speed_kmh") double speedKmh,
        @JsonProperty("heading_deg") double headingDeg,
        @JsonProperty("route_id") String routeId,
        @JsonProperty("route_name") String routeName,
        @JsonProperty("schedule_status") String scheduleStatus,
        @JsonProperty("delay_minutes") int delayMinutes,
        @JsonProperty("next_stop_id") String nextStopId,
        @JsonProperty("next_stop_name") String nextStopName,
        @JsonProperty("eta_seconds") int etaSeconds,
        @JsonProperty("estimated_passengers") int estimatedPassengers,
        @JsonProperty("crowding_level") String crowdingLevel,
        @JsonProperty("timestamp") String timestamp,
        @JsonProperty("is_active") boolean isActive) {
}
