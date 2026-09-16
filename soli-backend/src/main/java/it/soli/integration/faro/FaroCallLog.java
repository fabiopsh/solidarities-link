package it.soli.integration.faro;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.UUID;

/** Trace of every exchange with FARO (outbound API calls and inbound engagements), for audit and demo. */
@Entity
@Table(name = "soli_faro_call_logs")
public class FaroCallLog extends PanacheEntityBase {

    public enum Direction { OUTBOUND, INBOUND }

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    public UUID id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    public Direction direction;

    @Column(nullable = false)
    public String method;

    @Column(nullable = false)
    public String uri;

    @Column(name = "http_status")
    public Integer httpStatus;

    @Column(name = "request_body", columnDefinition = "TEXT")
    public String requestBody;

    @Column(name = "response_body", columnDefinition = "TEXT")
    public String responseBody;

    @Column(name = "duration_ms")
    public Long durationMs;

    @Column(name = "actor_id")
    public UUID actorId;

    @Column(name = "task_id")
    public UUID taskId;

    @Column(nullable = false, updatable = false)
    public LocalDateTime timestamp;

    @PrePersist
    public void prePersist() {
        timestamp = LocalDateTime.now();
    }
}
