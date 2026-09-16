package it.soli.integration.faro.dto;

import java.util.List;

/** Body of FARO {@code POST /api/services} ("Registrazione servizio del territorio", FR12). */
public record FaroServiceRegistration(
        String endpoint,
        String type,
        String status,
        Double avgLatency,
        Double currentLoad,
        Double latitude,
        Double longitude,
        List<String> capabilities) {
}
