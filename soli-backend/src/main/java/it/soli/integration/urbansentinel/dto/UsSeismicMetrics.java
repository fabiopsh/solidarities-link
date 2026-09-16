package it.soli.integration.urbansentinel.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;

/** 200 OK of {@code GET /api/v1/seismic-metrics}: KPIs per sensor plus the seismic events they refer to. */
public record UsSeismicMetrics(
        @JsonProperty("count") int count,
        @JsonProperty("events") List<UsEarthquake> events,
        @JsonProperty("metrics") List<Metric> metrics) {

    /** KPI fields not listed in {@code select_metrics} are omitted. Accelerations in mg. */
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record Metric(
            @JsonProperty("id_event") String idEvent,
            @JsonProperty("building_id") String buildingId,
            @JsonProperty("sensor_id") String sensorId,
            @JsonProperty("sensor_name") String sensorName,
            @JsonProperty("computed_at") String computedAt,
            @JsonProperty("distance_km") Double distanceKm,
            @JsonProperty("peak_acc_x") Double peakAccX,
            @JsonProperty("peak_acc_y") Double peakAccY,
            @JsonProperty("peak_acc_z") Double peakAccZ,
            @JsonProperty("peak_resultant") Double peakResultant,
            @JsonProperty("event_alert_level") String eventAlertLevel,
            @JsonProperty("pre_post_alert_level") String prePostAlertLevel) {
    }
}
