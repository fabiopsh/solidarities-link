package it.soli.integration.faro;

import it.soli.integration.faro.dto.FaroEngageRequest;
import it.soli.integration.faro.dto.FaroEngageResponse;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

import java.util.Map;

/** Handles an inbound engagement end to end: business outcome, HTTP status, trace and latency metric. */
@ApplicationScoped
public class FaroEngageHandler {

    public record Outcome(int status, Object body) {
    }

    public static final String ENGAGE_PATH = "/api/integrations/faro/engage";

    @Inject
    FaroEngagementService engagementService;

    @Inject
    FaroCallLogger callLogger;

    @Inject
    FaroStateService stateService;

    public Outcome handle(FaroEngageRequest request) {
        long start = System.currentTimeMillis();
        Outcome outcome;
        try {
            FaroEngageResponse response = engagementService.engage(request);
            outcome = new Outcome(200, response);
        } catch (FaroEngagementService.EngageRejected e) {
            outcome = new Outcome(e.status, Map.of("status", e.status, "error", e.getMessage()));
        }
        long duration = System.currentTimeMillis() - start;
        callLogger.log(FaroCallLog.Direction.INBOUND, "POST", ENGAGE_PATH, outcome.status(),
                request, outcome.body(), duration, null, null);
        stateService.recordEngageLatency(duration);
        return outcome;
    }
}
