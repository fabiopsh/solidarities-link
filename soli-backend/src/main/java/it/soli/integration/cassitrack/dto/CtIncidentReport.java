package it.soli.integration.cassitrack.dto;

/** Body of {@code POST /api/v1/incidents} (proposed C-01 contract): report from an accredited external partner. */
public record CtIncidentReport(
        String type,
        String description,
        double lat,
        double lon,
        String routeId,
        String stopId,
        Integer expectedDelayMinutes,
        String source,
        String externalReference) {
}
