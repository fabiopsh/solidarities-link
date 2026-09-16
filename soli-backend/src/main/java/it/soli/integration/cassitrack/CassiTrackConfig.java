package it.soli.integration.cassitrack;

import io.smallrye.config.ConfigMapping;
import io.smallrye.config.WithDefault;

@ConfigMapping(prefix = "soli.cassitrack")
public interface CassiTrackConfig {

    @WithDefault("true")
    boolean enabled();

    /** Only "mock" is shipped in the POC. */
    @WithDefault("mock")
    String mode();

    /** CassiTrack REST API (fleet data, open data + partner analytics). */
    String baseUrl();

    /** OmniMove REST API (journey planner). */
    String omnimoveBaseUrl();

    /** Partner account on CassiTrack (analytics, fleet registry, incidents). */
    String username();

    String password();

    /** Integration account on OmniMove (journey search, merged arrivals). */
    String omnimoveUsername();

    String omnimovePassword();

    /** Area served by the Cassino TPL network: SOLI features are offered only inside it. */
    @WithDefault("41.4917")
    double coverageLatitude();

    @WithDefault("13.8310")
    double coverageLongitude();

    @WithDefault("6")
    double coverageRadiusKm();

    /** Farthest stop proposed as boarding/alighting point. */
    @WithDefault("700")
    int maxWalkToStopMeters();

    /** Matching: volunteers outside their action radius are still notified if the task is reachable by TPL within this time. */
    @WithDefault("35")
    int matchingMaxTransitMinutes();

    /** Incidents within this distance from a pickup/destination are reported even if no route is affected. */
    @WithDefault("400")
    int incidentProximityMeters();

    @WithDefault("10")
    int cacheSeconds();
}
