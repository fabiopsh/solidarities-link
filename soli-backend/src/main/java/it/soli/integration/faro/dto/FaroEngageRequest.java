package it.soli.integration.faro.dto;

/**
 * Engagement request sent by FARO's Binder to the endpoint SOLI declared in the service registry.
 * FARO leaves the engage API to each territory service: this is the contract SOLI publishes.
 */
public record FaroEngageRequest(
        Long emergencyId,
        String eventId,
        String workflowInstanceId,
        String capability,
        String eventType,
        String severity,
        Double latitude,
        Double longitude,
        String address,
        MeetingPoint meetingPoint,
        Integer requestedVolunteers,
        String notes) {

    /** Safe gathering point outside the risk perimeter, where volunteers are sent. */
    public record MeetingPoint(Double latitude, Double longitude, String address) {
    }
}
