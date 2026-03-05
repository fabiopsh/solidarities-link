package it.soli.entity;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "soli_tasks")
public class Task extends PanacheEntityBase {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    public UUID id;

    @Column(name = "creator_id", nullable = false)
    public UUID creatorId;

    @Column(name = "beneficiary_id", nullable = false)
    public UUID beneficiaryId;

    @Column(name = "volunteer_id")
    public UUID volunteerId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    public ServiceCategory category;

    @Column(nullable = false)
    public String title;

    @Column(columnDefinition = "TEXT")
    public String description;

    @Enumerated(EnumType.STRING)
    @Column(name = "urgency_level", nullable = false)
    public UrgencyLevel urgencyLevel;

    @Column(name = "scheduled_at")
    public LocalDateTime scheduledAt;

    @Column(name = "target_location")
    public String targetLocation;

    @Column(name = "target_address")
    public String targetAddress;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    public TaskStatus status = TaskStatus.OPEN;

    @Column(name = "check_in_token")
    public String checkInToken;

    @Column(name = "check_out_token")
    public String checkOutToken;

    @Column(name = "reward_credits")
    public Integer rewardCredits = 0;

    @Column(name = "created_at", nullable = false, updatable = false)
    public LocalDateTime createdAt;

    @Column(name = "updated_at")
    public LocalDateTime updatedAt;

    @PrePersist
    public void prePersist() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    public void preUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
