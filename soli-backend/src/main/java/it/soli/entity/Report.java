package it.soli.entity;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "soli_reports")
public class Report extends PanacheEntityBase {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    public UUID id;

    @Column(name = "task_id")
    public UUID taskId;

    @Column(name = "reporter_id", nullable = false)
    public UUID reporterId;

    @Column(name = "reported_user_id", nullable = false)
    public UUID reportedUserId;

    @Column(columnDefinition = "TEXT", nullable = false)
    public String reason;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    public ReportStatus status = ReportStatus.OPEN;

    @Column(name = "created_at", nullable = false, updatable = false)
    public LocalDateTime createdAt;

    @Column(name = "resolved_at")
    public LocalDateTime resolvedAt;

    @PrePersist
    public void prePersist() {
        createdAt = LocalDateTime.now();
    }
}
