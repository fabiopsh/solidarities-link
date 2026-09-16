package it.soli.integration.faro;

import io.smallrye.config.ConfigMapping;
import io.smallrye.config.WithDefault;

@ConfigMapping(prefix = "soli.faro")
public interface FaroConfig {

    @WithDefault("true")
    boolean enabled();

    /** Only "mock" is shipped in the POC. */
    @WithDefault("mock")
    String mode();

    String baseUrl();

    @WithDefault("60s")
    String heartbeatEvery();

    @WithDefault("15s")
    String streamPollEvery();

    /** Emergencies no longer re-published on the stream for this long are considered over. */
    @WithDefault("120")
    int streamTtlSeconds();

    /** Maximum risk perimeter (CRITICAL severity); lower severities use a fraction of it. */
    @WithDefault("1500")
    int safetyRadiusMeters();

    String username();

    String password();

    String engageEndpoint();

    String engageApiKey();

    /** SOLI seat declared in FARO's service registry. */
    @WithDefault("43.7228")
    double serviceLatitude();

    @WithDefault("10.3966")
    double serviceLongitude();
}
