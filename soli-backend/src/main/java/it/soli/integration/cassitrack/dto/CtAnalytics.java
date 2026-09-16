package it.soli.integration.cassitrack.dto;

import java.util.List;

/** Analytics payloads of CassiTrack (CT-12, CT-14, CT-16, CT-17). */
public final class CtAnalytics {

    private CtAnalytics() {
    }

    /** CT-12 {@code GET /api/v1/analytics/summary}. */
    public record Summary(int activeBuses, int tripsToday, double onTimePercentage) {
    }

    /** CT-14 {@code GET /api/v1/analytics/busiest-hours}. */
    public record BusiestHours(List<Hour> busiestHours) {
        public record Hour(int hour, double avgPassengers) {
        }
    }

    /** CT-16 {@code GET /api/v1/analytics/delay-by-route}. */
    public record DelayByRoute(List<Point> data) {
        public record Point(String routeId, String timeSlot, double avgDelayMinutes) {
        }
    }

    /** CT-17 {@code GET /api/v1/analytics/co2}. */
    public record Co2(double co2SavedKg, double passengerKm) {
    }
}
