package it.soli.integration.urbansentinel;

import it.soli.integration.urbansentinel.dto.*;

import java.util.List;

/**
 * Port towards Urban Sentinel (Structural Health Monitoring platform), base URI {@code /api/v1}.
 * One method per documented REST operation; non-2xx answers raise {@link UsApiException}.
 * The POC ships {@link MockUrbanSentinelClient}.
 */
public interface UrbanSentinelClient {

    /** POST /auth/login — 200 OK (token + refresh_token_cookie), 400 Bad Request, 401 Unauthorized. */
    LoginResult login(UsLoginRequest credentials);

    record LoginResult(UsLoginResponse body, String refreshCookie) {
    }

    /** GET /earthquakes?min_magnitude=&from=&to= — events detected by the INGV integration. */
    List<UsEarthquake> earthquakes(UsSession session, Double minMagnitude, String from, String to);

    /** GET /buildings?name=&min_latitude=&max_latitude=&min_longitude=&max_longitude= — 200 OK, 400 Bad Request. */
    List<UsBuilding> buildings(UsSession session, String name, Double minLatitude, Double maxLatitude,
                               Double minLongitude, Double maxLongitude);

    /** GET /seismic-metrics?id_event=&sensor_id=&building_id=&start_date=&end_date=&select_metrics= — 200 OK, 400 Bad Request. */
    UsSeismicMetrics seismicMetrics(UsSession session, String idEvent, String sensorId, String buildingId,
                                    String startDate, String endDate, String selectMetrics);
}
