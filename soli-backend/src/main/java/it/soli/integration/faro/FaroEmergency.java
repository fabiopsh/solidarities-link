package it.soli.integration.faro;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/**
 * Local materialized view of an emergency known to SOLI, fed by FARO's "Stream eventi"
 * (idempotent on eventId) and, for emergencies SOLI is engaged on, by GET /api/emergencies/{id}.
 */
@Entity
@Table(name = "soli_faro_emergencies")
public class FaroEmergency extends PanacheEntityBase {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    public UUID id;

    @Column(name = "event_id", nullable = false, unique = true)
    public String eventId;

    // FARO emergency id (GSE); known only once FARO engages SOLI on it
    @Column(name = "faro_emergency_id")
    public Long faroEmergencyId;

    @Column(nullable = false)
    public String category;

    @Column(nullable = false)
    public String severity;

    public Double latitude;

    public Double longitude;

    public String address;

    public Double confidence;

    @Column(name = "has_injured")
    public Boolean hasInjured = false;

    @Column(name = "has_unconscious")
    public Boolean hasUnconscious = false;

    @Column(name = "has_trapped")
    public Boolean hasTrapped = false;

    // OPEN / IN_PROGRESS / CLOSED as reported by FARO (null until queried)
    @Column(name = "faro_status")
    public String faroStatus;

    @Column(name = "workflow_instance_id")
    public String workflowInstanceId;

    // false once CLOSED on FARO or no longer re-published on the stream
    @Column(nullable = false)
    public Boolean active = true;

    @Column(nullable = false)
    public Boolean engaged = false;

    @Column(name = "first_seen_at", nullable = false)
    public LocalDateTime firstSeenAt;

    @Column(name = "last_update_at", nullable = false)
    public LocalDateTime lastUpdateAt;

    public static FaroEmergency findByEventId(String eventId) {
        return find("eventId", eventId).firstResult();
    }

    public static List<FaroEmergency> listActive() {
        return list("active = true ORDER BY lastUpdateAt DESC");
    }
}
