package it.soli.integration.faro.dto;

import java.util.List;
import java.util.UUID;

/** 200 OK body returned to FARO's Binder when SOLI accepts an engagement. */
public record FaroEngageResponse(
        UUID engagementId,
        String status,
        String provider,
        String capability,
        List<UUID> taskIds,
        int eligibleVolunteers,
        int estimatedResponseMinutes,
        String meetingPointAddress) {
}
