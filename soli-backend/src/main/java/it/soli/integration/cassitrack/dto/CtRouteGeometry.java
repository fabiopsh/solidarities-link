package it.soli.integration.cassitrack.dto;

import java.util.List;

/** Item of CT-08 {@code GET /api/v1/routes}: route with its stops ordered by sequence. */
public record CtRouteGeometry(String id, String name, String longName, String color, List<Stop> stops) {

    public record Stop(String id, String name, double lat, double lon) {
    }
}
