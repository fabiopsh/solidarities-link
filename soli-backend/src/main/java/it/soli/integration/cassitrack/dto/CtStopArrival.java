package it.soli.integration.cassitrack.dto;

/**
 * StopArrivalDTO: CT-06 {@code /stops/{stopId}/arrivals} (live), CT-07 {@code /stops/{stopId}/schedule} (planned)
 * and OM-12 {@code /journeys/stops/{stopId}/arrivals} (merged).
 */
public record CtStopArrival(
        String tripId,
        String vehicleId,
        String routeId,
        String routeName,
        String scheduledArrival,
        String estimatedArrival,
        int delayMinutes,
        String crowdingLevel,
        String scheduleStatus,
        boolean isRealtime) {
}
