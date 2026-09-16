package it.soli.integration.cassitrack;

import it.soli.integration.cassitrack.dto.*;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.jboss.logging.Logger;

import java.util.List;
import java.util.function.Function;
import java.util.function.Supplier;

/**
 * SOLI's access point to the Cassino mobility platform: open-data calls go straight to CassiTrack, partner calls
 * replay the {@code cassitrack_jwt} cookie of the SOLI partner account, journey planning uses the SOLI integration
 * account on OmniMove ({@code omnimove_jwt}). Sessions are renewed on 401.
 */
@ApplicationScoped
public class CassiTrackGateway {

    private static final Logger LOG = Logger.getLogger(CassiTrackGateway.class);

    @Inject
    CassiTrackClient cassiTrack;

    @Inject
    OmniMoveClient omniMove;

    @Inject
    CassiTrackConfig config;

    private volatile CtSession cassiTrackSession;
    private volatile CtSession omniMoveSession;

    // ── CassiTrack open data ────────────────────────────────────────────

    public List<CtVehicleStatus> vehicles() {
        return open("GET /cassitrack/api/v1/vehicles", cassiTrack::vehicles);
    }

    public long fleetSize() {
        return open("GET /cassitrack/api/v1/vehicles/fleet-size", cassiTrack::fleetSize);
    }

    public List<CtRouteGeometry> routes() {
        return open("GET /cassitrack/api/v1/routes", cassiTrack::routes);
    }

    public List<CtStopArrival> schedule(String stopId) {
        return open("GET /cassitrack/api/v1/stops/" + stopId + "/schedule", () -> cassiTrack.schedule(stopId));
    }

    public List<CtIncident> incidents() {
        return open("GET /cassitrack/api/v1/incidents?active=true", cassiTrack::incidents);
    }

    // ── CassiTrack partner ──────────────────────────────────────────────

    public CtAnalytics.Summary analyticsSummary() {
        return partner("GET /cassitrack/api/v1/analytics/summary", cassiTrack::analyticsSummary);
    }

    public CtAnalytics.BusiestHours busiestHours() {
        return partner("GET /cassitrack/api/v1/analytics/busiest-hours", cassiTrack::busiestHours);
    }

    public CtAnalytics.DelayByRoute delayByRoute(String startTime, String endTime) {
        return partner("GET /cassitrack/api/v1/analytics/delay-by-route?startTime=" + startTime + "&endTime=" + endTime + "&groupBy=hour",
                s -> cassiTrack.delayByRoute(s, startTime, endTime, null));
    }

    public CtAnalytics.Co2 co2(String startTime, String endTime) {
        return partner("GET /cassitrack/api/v1/analytics/co2?startTime=" + startTime + "&endTime=" + endTime,
                s -> cassiTrack.co2(s, startTime, endTime));
    }

    public List<CtBus> buses() {
        return partner("GET /cassitrack/api/v1/buses", cassiTrack::buses);
    }

    public CtIncident reportIncident(CtIncidentReport report) {
        return partner("POST /cassitrack/api/v1/incidents", s -> cassiTrack.reportIncident(s, report));
    }

    // ── OmniMove ────────────────────────────────────────────────────────

    public OmJourneyResponse searchJourneys(OmJourneySearchRequest request) {
        return traveller(String.format(java.util.Locale.ROOT, "POST /omnimove/api/v1/journeys/search (%.4f,%.4f -> %.4f,%.4f, modes=%s)",
                        request.originLat(), request.originLon(), request.destLat(), request.destLon(), request.modes()),
                s -> omniMove.search(s, request));
    }

    public List<CtStopArrival> stopArrivals(String stopId, int limit) {
        return traveller("GET /omnimove/api/v1/journeys/stops/" + stopId + "/arrivals?limit=" + limit,
                s -> omniMove.arrivals(s, stopId, limit));
    }

    // ── Plumbing ────────────────────────────────────────────────────────

    private <T> T open(String request, Supplier<T> fn) {
        long start = System.currentTimeMillis();
        try {
            T result = fn.get();
            LOG.debugf("[CassiTrack] %s -> 200 (%d ms)", request, System.currentTimeMillis() - start);
            return result;
        } catch (CtApiException e) {
            LOG.warnf("[CassiTrack] %s -> %d %s", request, e.status, e.getMessage());
            throw e;
        }
    }

    private <T> T partner(String request, Function<CtSession, T> fn) {
        return withSession("[CassiTrack]", request, fn, () -> {
            synchronized (this) {
                if (cassiTrackSession != null) return cassiTrackSession;
                cassiTrackSession = cassiTrack.login(new CtLoginRequest(config.username(), config.password()));
                LOG.infof("[CassiTrack] POST %s/auth/login -> 200 (partner %s, Set-Cookie cassitrack_jwt)", config.baseUrl(), config.username());
            }
            return cassiTrackSession;
        }, () -> cassiTrackSession = null);
    }

    private <T> T traveller(String request, Function<CtSession, T> fn) {
        return withSession("[OmniMove]", request, fn, () -> {
            synchronized (this) {
                if (omniMoveSession != null) return omniMoveSession;
                omniMoveSession = omniMove.login(new CtLoginRequest(config.omnimoveUsername(), config.omnimovePassword()));
                LOG.infof("[OmniMove] POST %s/auth/login -> 200 (%s, Set-Cookie omnimove_jwt)", config.omnimoveBaseUrl(), config.omnimoveUsername());
            }
            return omniMoveSession;
        }, () -> omniMoveSession = null);
    }

    private <T> T withSession(String tag, String request, Function<CtSession, T> fn,
                                           Supplier<CtSession> session, Runnable invalidate) {
        long start = System.currentTimeMillis();
        try {
            T result;
            try {
                result = fn.apply(session.get());
            } catch (CtApiException e) {
                if (e.status != 401) throw e;
                invalidate.run();
                result = fn.apply(session.get());
            }
            LOG.infof("%s %s -> 200 (%d ms)", tag, request, System.currentTimeMillis() - start);
            return result;
        } catch (CtApiException e) {
            LOG.warnf("%s %s -> %d %s", tag, request, e.status, e.getMessage());
            throw e;
        }
    }
}
