package it.soli.integration.faro;

import io.quarkus.runtime.StartupEvent;
import io.quarkus.scheduler.Scheduled;
import it.soli.integration.faro.dto.FaroApiException;
import it.soli.integration.faro.dto.FaroService;
import it.soli.integration.faro.dto.FaroServicePatch;
import it.soli.integration.faro.dto.FaroServiceRegistration;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.event.Observes;
import jakarta.inject.Inject;
import org.eclipse.microprofile.context.ManagedExecutor;
import org.jboss.logging.Logger;

import java.util.List;

/**
 * Keeps SOLI registered as a territory service in FARO's registry (FR11-FR13 of FARO):
 * capabilities + service registration at startup, then a periodic heartbeat carrying
 * SOLI's real saturation (share of volunteers already committed to a task).
 */
@ApplicationScoped
public class FaroRegistrationService {

    private static final Logger LOG = Logger.getLogger(FaroRegistrationService.class);

    /** Operational capabilities SOLI offers to FARO's plans, mapped to SOLI service categories. */
    public static final List<String> CAPABILITIES = List.of(
            "ElderlyAssistance", "TransportAssistance", "LogisticSupport", "PetAssistance", "PsychosocialSupport");

    /** Extension requested to FARO's ServiceType enum (FIRE_STATION, HOSPITAL, POLICE). */
    public static final String SERVICE_TYPE = "CIVIC_VOLUNTEERING";

    @Inject
    FaroGateway gateway;

    @Inject
    FaroStateService stateService;

    @Inject
    FaroConfig config;

    @Inject
    ManagedExecutor executor;

    void onStart(@Observes StartupEvent ev) {
        if (!config.enabled()) {
            LOG.info("[FARO] integration disabled");
            return;
        }
        if (!"mock".equals(config.mode())) {
            LOG.warnf("[FARO] mode '%s' not available in this build, using the simulated FARO sandbox", config.mode());
        }
        executor.execute(this::safeHeartbeat);
    }

    @Scheduled(every = "${soli.faro.heartbeat-every}", delayed = "30s",
            concurrentExecution = Scheduled.ConcurrentExecution.SKIP)
    void scheduledHeartbeat() {
        if (config.enabled()) {
            safeHeartbeat();
        }
    }

    private void safeHeartbeat() {
        try {
            heartbeat();
        } catch (Exception e) {
            LOG.warnf("[FARO] registry sync failed: %s", e.getMessage());
        }
    }

    /** PATCH /api/services/{id}; (re-)registers when SOLI is unknown to the registry (404). */
    public synchronized FaroService heartbeat() {
        FaroStateService.Load load = stateService.currentLoad();
        double ratio = Math.round(load.ratio() * 100) / 100.0;
        String status = load.volunteers() == 0 ? "DOWN" : ratio >= 0.8 ? "BUSY" : "UP";
        double latency = Math.round(stateService.snapshot().avgEngageLatencyMs() == null ? 0 : stateService.snapshot().avgEngageLatencyMs());

        Long serviceId = stateService.snapshot().faroServiceId();
        FaroService service = null;
        if (serviceId != null) {
            try {
                service = gateway.updateService(serviceId, new FaroServicePatch(status, latency, ratio));
            } catch (FaroApiException e) {
                if (e.status != 404) throw e;
                LOG.info("[FARO] service no longer in registry, registering again");
            }
        }
        if (service == null) {
            service = register(status, latency, ratio);
        }
        stateService.saveHeartbeat(status, ratio);
        return service;
    }

    private FaroService register(String status, double latency, double load) {
        for (String capability : CAPABILITIES) {
            try {
                gateway.registerCapability(capability);
            } catch (FaroApiException e) {
                if (e.status != 400) throw e; // 400 = already present in the registry: fine
            }
        }
        FaroService service = gateway.registerService(new FaroServiceRegistration(
                config.engageEndpoint(), SERVICE_TYPE, status, latency, load,
                config.serviceLatitude(), config.serviceLongitude(), CAPABILITIES));
        stateService.saveRegistration(service.id(), CAPABILITIES);
        LOG.infof("[FARO] SOLI registered in FARO service registry with id %d", service.id());
        return service;
    }
}
