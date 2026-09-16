package it.soli.integration.faro.dto;

/**
 * Body of FARO {@code POST /api/reports} ("Invia segnalazione", FR1/FR2).
 * Sent with {@code Authorization: Bearer <token>} so FARO assigns the verified-reporter confidence.
 */
public record FaroReportRequest(
        String emergencyCategory,
        Double latitude,
        Double longitude,
        String timestamp,
        String address,
        String description,
        boolean hasInjured,
        boolean hasUnconscious,
        boolean hasTrapped,
        boolean hasSpecialVehicleInvolved,
        boolean hasBuildingCollapse) {
}
