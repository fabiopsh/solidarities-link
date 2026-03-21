package it.soli.entity;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "soli_association_memberships")
public class AssociationMembership extends PanacheEntityBase {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    public UUID id;

    @Column(name = "association_id", nullable = false)
    public UUID associationId;

    @Column(name = "user_id", nullable = false)
    public UUID userId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    public AssociationRole role = AssociationRole.MEMBER;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    public MembershipStatus status = MembershipStatus.PENDING;

    @Column(name = "joined_at", nullable = false, updatable = false)
    public LocalDateTime joinedAt;

    @Column(name = "updated_at")
    public LocalDateTime updatedAt;

    @PrePersist
    public void prePersist() {
        joinedAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    public void preUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public static List<AssociationMembership> findByAssociationId(UUID associationId) {
        return list("associationId", associationId);
    }

    public static List<AssociationMembership> findByUserId(UUID userId) {
        return list("userId", userId);
    }

    public static AssociationMembership findByAssociationIdAndUserId(UUID associationId, UUID userId) {
        return find("associationId = ?1 and userId = ?2", associationId, userId).firstResult();
    }
}
