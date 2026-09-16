package it.soli.integration.cassitrack.dto;

/** Item of OM-10 {@code GET /api/v1/journeys/stops}. */
public record OmStop(String id, String name, double lat, double lon) {
}
