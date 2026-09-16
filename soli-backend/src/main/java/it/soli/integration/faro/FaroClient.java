package it.soli.integration.faro;

import it.soli.integration.faro.dto.*;

import java.util.List;

/**
 * Port towards FARO (First Alert and Response Orchestration). One method per FARO API
 * documented in "Codifica RESTful delle interfacce dei servizi", plus the consumer side of
 * the "Stream eventi" topic. Every method throws {@link FaroApiException} on non-2xx answers.
 *
 * The POC ships {@link MockFaroClient}; an HTTP implementation can replace it without
 * touching the services that use {@link FaroGateway}.
 */
public interface FaroClient {

    /** POST /api/users — 201 Created, 400 Bad Request. */
    FaroUser registerUser(FaroCredentials credentials);

    /** POST /api/users/{id}/sessions — 200 OK, 401 Unauthorized. */
    FaroSession login(long userId, FaroCredentials credentials);

    /** POST /api/reports — 202 Accepted, 400 Bad Request. Returns the HTTP status. */
    int sendReport(String bearerToken, FaroReportRequest report);

    /** POST /api/capabilities — 201 Created, 400 Bad Request (missing or duplicate name). */
    FaroCapability registerCapability(String bearerToken, String name);

    /** POST /api/services — 201 Created, 400 Bad Request. */
    FaroService registerService(String bearerToken, FaroServiceRegistration registration);

    /** PATCH /api/services/{id} — 200 OK, 404 Not Found. */
    FaroService updateService(String bearerToken, long serviceId, FaroServicePatch patch);

    /** GET /api/services?capability={cap}&type=&status= — 200 OK (possibly empty). */
    List<FaroService> discoverServices(String bearerToken, String capability, String type, String status);

    /** GET /api/emergencies/{id} — 200 OK, 404 Not Found. */
    FaroEmergencyStatus getEmergency(String bearerToken, long emergencyId);

    /** Consumer poll on the "Stream eventi" topic for the given consumer group (next batch after the committed offset). */
    List<FaroStreamEvent> pollEventStream(String consumerGroup);
}
