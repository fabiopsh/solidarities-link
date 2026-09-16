package it.soli.integration.faro;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.*;
import java.time.LocalDateTime;

/** Singleton row holding SOLI's identity on FARO (reporter account, service registry entry, last heartbeat). */
@Entity
@Table(name = "soli_faro_integration_state")
public class FaroIntegrationState extends PanacheEntityBase {

    public static final long SINGLETON_ID = 1L;

    @Id
    public Long id = SINGLETON_ID;

    @Column(name = "faro_user_id")
    public Long faroUserId;

    @Column(name = "faro_service_id")
    public Long faroServiceId;

    @Column(name = "registered_capabilities")
    public String registeredCapabilities;

    @Column(name = "registered_at")
    public LocalDateTime registeredAt;

    @Column(name = "last_heartbeat_at")
    public LocalDateTime lastHeartbeatAt;

    @Column(name = "last_status")
    public String lastStatus;

    @Column(name = "last_load")
    public Double lastLoad;

    // Exponential moving average of the engage endpoint handling time (ms), sent as avgLatency
    @Column(name = "avg_engage_latency_ms")
    public Double avgEngageLatencyMs = 0.0;

    public static FaroIntegrationState getOrCreate() {
        FaroIntegrationState state = findById(SINGLETON_ID);
        if (state == null) {
            state = new FaroIntegrationState();
            state.persist();
        }
        return state;
    }
}
