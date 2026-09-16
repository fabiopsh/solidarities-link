package it.soli.integration.cassitrack;

import it.soli.integration.cassitrack.dto.*;

import java.util.List;

/**
 * Port towards CassiTrack (TPL fleet platform of Cassino), base URI {@code /cassitrack/api/v1}.
 * One method per documented REST operation; non-2xx answers raise {@link CtApiException}.
 * Open-data endpoints need no session; analytics and fleet registry need the {@code cassitrack_jwt} cookie.
 * The POC ships {@link MockCassiTrackClient}.
 */
public interface CassiTrackClient {

    /** CT-01 POST /auth/login — 200 OK + Set-Cookie cassitrack_jwt, 400 invalid credentials, 429 locked. */
    CtSession login(CtLoginRequest credentials);

    /** CT-03 GET /vehicles — live positions of vehicles tracked in the last 5 minutes (open data). */
    List<CtVehicleStatus> vehicles();

    /** CT-05 GET /vehicles/fleet-size — { "total": Long } (open data). */
    long fleetSize();

    /** CT-06 GET /stops/{stopId}/arrivals — live arrivals computed from GPS positions (open data). */
    List<CtStopArrival> arrivals(String stopId);

    /** CT-07 GET /stops/{stopId}/schedule — planned arrivals for the rest of the day (open data), 400 invalid stop. */
    List<CtStopArrival> schedule(String stopId);

    /** CT-08 GET /routes — active routes with their ordered stops (open data). */
    List<CtRouteGeometry> routes();

    /** CT-12 GET /analytics/summary — cookie cassitrack_jwt; 403 wrong role. */
    CtAnalytics.Summary analyticsSummary(CtSession session);

    /** CT-14 GET /analytics/busiest-hours — cookie cassitrack_jwt. */
    CtAnalytics.BusiestHours busiestHours(CtSession session);

    /** CT-16 GET /analytics/delay-by-route?groupBy=hour — cookie cassitrack_jwt. */
    CtAnalytics.DelayByRoute delayByRoute(CtSession session, String startTime, String endTime, String routeIds);

    /** CT-17 GET /analytics/co2 — cookie cassitrack_jwt. */
    CtAnalytics.Co2 co2(CtSession session, String startTime, String endTime);

    /** CT-25 GET /buses — cookie cassitrack_jwt. */
    List<CtBus> buses(CtSession session);

    /** C-01 (proposed contract) GET /incidents?active=true — open data, like the other service information. */
    List<CtIncident> incidents();

    /** C-01 (proposed contract) POST /incidents — cookie cassitrack_jwt; 201 Created, 400 invalid payload. */
    CtIncident reportIncident(CtSession session, CtIncidentReport report);
}
