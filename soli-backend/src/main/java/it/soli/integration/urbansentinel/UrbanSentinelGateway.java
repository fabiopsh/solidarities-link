package it.soli.integration.urbansentinel;

import it.soli.integration.urbansentinel.dto.*;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.jboss.logging.Logger;

import java.util.List;
import java.util.function.Function;

/**
 * SOLI's access point to Urban Sentinel: logs in with the integration account, presents
 * {@code Authorization: Bearer} and {@code refresh_token_cookie} on every call and re-authenticates on 401.
 */
@ApplicationScoped
public class UrbanSentinelGateway {

    private static final Logger LOG = Logger.getLogger(UrbanSentinelGateway.class);

    @Inject
    UrbanSentinelClient client;

    @Inject
    UrbanSentinelConfig config;

    private volatile UsSession session;

    public List<UsEarthquake> earthquakes(double minMagnitude, String from, String to) {
        return call("GET /api/v1/earthquakes?min_magnitude=" + minMagnitude + "&from=" + from + "&to=" + to,
                s -> client.earthquakes(s, minMagnitude, from, to));
    }

    public List<UsBuilding> buildings(double minLat, double maxLat, double minLon, double maxLon) {
        return call(String.format(java.util.Locale.ROOT,
                        "GET /api/v1/buildings?min_latitude=%.4f&max_latitude=%.4f&min_longitude=%.4f&max_longitude=%.4f",
                        minLat, maxLat, minLon, maxLon),
                s -> client.buildings(s, null, minLat, maxLat, minLon, maxLon));
    }

    public UsSeismicMetrics seismicMetrics(String idEvent, String selectMetrics) {
        return call("GET /api/v1/seismic-metrics?id_event=" + idEvent + "&select_metrics=" + selectMetrics,
                s -> client.seismicMetrics(s, idEvent, null, null, null, null, selectMetrics));
    }

    private <T> T call(String request, Function<UsSession, T> fn) {
        long start = System.currentTimeMillis();
        try {
            T result;
            try {
                result = fn.apply(session());
            } catch (UsApiException e) {
                if (e.status != 401) throw e;
                session = null;
                result = fn.apply(session());
            }
            LOG.infof("[Urban Sentinel] %s -> 200 (%d ms)", request, System.currentTimeMillis() - start);
            return result;
        } catch (UsApiException e) {
            LOG.warnf("[Urban Sentinel] %s -> %d %s", request, e.status, e.getMessage());
            throw e;
        }
    }

    private synchronized UsSession session() {
        if (session == null) {
            UrbanSentinelClient.LoginResult login = client.login(new UsLoginRequest(config.username(), config.password()));
            session = new UsSession(login.body().accessToken(), login.refreshCookie());
            LOG.infof("[Urban Sentinel] POST %s/auth/login -> 200 (user %s, role %s)",
                    config.baseUrl(), login.body().user().username(), login.body().user().role());
        }
        return session;
    }
}
