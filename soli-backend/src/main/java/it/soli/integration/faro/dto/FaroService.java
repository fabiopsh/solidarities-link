package it.soli.integration.faro.dto;

import java.util.List;

/** Service as returned by FARO's service registry (registration, PATCH and discovery). */
public record FaroService(
        Long id,
        String name,
        String endpoint,
        String type,
        String status,
        Double avgLatency,
        Double currentLoad,
        Double latitude,
        Double longitude,
        List<String> capabilities) {
}
