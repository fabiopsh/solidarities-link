package it.soli.integration.urbansentinel;

import io.smallrye.config.ConfigMapping;
import io.smallrye.config.WithDefault;

@ConfigMapping(prefix = "soli.urban-sentinel")
public interface UrbanSentinelConfig {

    @WithDefault("true")
    boolean enabled();

    /** Only "mock" is shipped in the POC. */
    @WithDefault("mock")
    String mode();

    String baseUrl();

    String username();

    String password();

    /** Events older than this are not offered in the SOLI map. */
    @WithDefault("90")
    int lookbackDays();

    @WithDefault("3.8")
    double minMagnitude();

    /** SOLI tasks within this distance from a monitored building are reported on its card. */
    @WithDefault("500")
    int nearTaskRadiusMeters();

    @WithDefault("60")
    int cacheSeconds();
}
