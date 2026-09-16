package it.soli.integration.faro.dto;

import java.util.List;

/** Response of FARO {@code GET /api/emergencies/{id}} ("Consultazione stato emergenza", FR15). */
public record FaroEmergencyStatus(
        Long id,
        String eventId,
        String eventType,
        String severity,
        String status,
        Double latitude,
        Double longitude,
        String workflowInstanceId,
        List<String> history) {
}
