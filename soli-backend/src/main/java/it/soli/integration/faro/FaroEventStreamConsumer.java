package it.soli.integration.faro;

import io.quarkus.scheduler.Scheduled;
import it.soli.integration.faro.dto.FaroApiException;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.jboss.logging.Logger;

/**
 * SOLI as a consumer (group "soli-platform") of FARO's "Stream eventi": keeps the map of
 * active emergencies up to date and follows, via GET /api/emergencies/{id}, the emergencies
 * SOLI has been engaged on.
 */
@ApplicationScoped
public class FaroEventStreamConsumer {

    private static final Logger LOG = Logger.getLogger(FaroEventStreamConsumer.class);

    @Inject
    FaroGateway gateway;

    @Inject
    FaroEmergencyService emergencyService;

    @Inject
    FaroConfig config;

    @Scheduled(every = "${soli.faro.stream-poll-every}", delayed = "5s",
            concurrentExecution = Scheduled.ConcurrentExecution.SKIP)
    void poll() {
        if (!config.enabled()) return;
        try {
            sync();
        } catch (Exception e) {
            LOG.warnf("[FARO] stream sync failed: %s", e.getMessage());
        }
    }

    public void sync() {
        emergencyService.upsertFromStream(gateway.pollEventStream());
        emergencyService.expireStale(config.streamTtlSeconds());
        for (Long id : emergencyService.engagedEmergencyIds()) {
            try {
                emergencyService.applyStatus(gateway.getEmergency(id));
            } catch (FaroApiException e) {
                if (e.status == 404) {
                    emergencyService.markUnknown(id);
                } else {
                    LOG.warnf("[FARO] status of emergency %d unavailable: %s", id, e.getMessage());
                }
            }
        }
    }
}
