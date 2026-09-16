package it.soli.integration.cassitrack.dto;

import java.util.List;

/** 200 OK of OM-11 {@code POST /api/v1/journeys/search} (JourneyResponse). */
public record OmJourneyResponse(List<Option> options) {

    /** JourneyOption: options are ordered by duration. */
    public record Option(String mode, int durationMinutes, double costEuros, double co2Grams, int greenIndex,
                         List<Leg> legs, String dataSource, String notice) {
    }

    /** Leg of a journey: stop, departure/arrival time, delay; {@code geometry} is the [lat, lon] path drawn on the map. */
    public record Leg(String mode, String fromName, String toName, String fromStopId, String toStopId,
                      String routeId, String routeName, String vehicleId, String departureTime, String arrivalTime,
                      int durationMinutes, double distanceKm, int delayMinutes, String crowdingLevel,
                      List<double[]> geometry) {
    }
}
