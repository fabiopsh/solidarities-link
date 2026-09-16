package it.soli.integration.cassitrack;

import it.soli.integration.cassitrack.dto.*;

import java.util.List;

/**
 * Port towards OmniMove (multimodal journey planner of Cassino), base URI {@code /omnimove/api/v1}.
 * Every call except login needs the {@code omnimove_jwt} cookie; non-2xx answers raise {@link CtApiException}.
 * The POC ships {@link MockOmniMoveClient}.
 */
public interface OmniMoveClient {

    /** OM-04 POST /auth/login — 200 OK + Set-Cookie omnimove_jwt, 401 invalid credentials, 403 not verified, 429 locked. */
    CtSession login(CtLoginRequest credentials);

    /** OM-10 GET /journeys/stops — active stops ordered by name (max 500). */
    List<OmStop> stops(CtSession session);

    /** OM-11 POST /journeys/search — options ordered by duration; 400 missing coordinates, 429 rate limit. */
    OmJourneyResponse search(CtSession session, OmJourneySearchRequest request);

    /** OM-12 GET /journeys/stops/{stopId}/arrivals?limit= — live data merged with the timetable; 400 invalid stop. */
    List<CtStopArrival> arrivals(CtSession session, String stopId, int limit);
}
