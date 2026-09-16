package it.soli.integration.cassitrack.dto;

import java.util.List;

/**
 * Service incident on the TPL network (road closed, protest, bus breakdown, roadworks...).
 * CassiTrack lists it among the "Could Have" evolutions (C-01, incident alarm system): the contract below is
 * the one proposed by SOLI for the POC, aligned with CassiTrack's REST conventions.
 */
public record CtIncident(
        String id,
        String type,
        String severity,
        String title,
        String description,
        List<String> routeIds,
        List<String> stopIds,
        String vehicleId,
        double lat,
        double lon,
        int radiusMeters,
        int expectedDelayMinutes,
        String detour,
        String source,
        String status,
        String reportedAt,
        String expectedEndAt) {
}
