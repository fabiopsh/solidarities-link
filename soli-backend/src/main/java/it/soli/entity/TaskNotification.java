package it.soli.entity;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "soli_task_notifications")
public class TaskNotification extends PanacheEntityBase {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    public UUID id;

    @Column(name = "task_id", nullable = false)
    public UUID taskId;

    @Column(name = "volunteer_id", nullable = false)
    public UUID volunteerId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    public NotificationStatus status = NotificationStatus.PENDING;

    @Column(name = "notified_at", nullable = false, updatable = false)
    public LocalDateTime notifiedAt;

    @Column(name = "responded_at")
    public LocalDateTime respondedAt;

    @PrePersist
    public void prePersist() {
        notifiedAt = LocalDateTime.now();
    }
}
