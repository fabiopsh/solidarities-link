package it.soli.entity;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "soli_caregiver_relations")
public class CaregiverRelation extends PanacheEntityBase {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    public UUID id;

    @Column(name = "caregiver_id", nullable = false)
    public UUID caregiverId;

    @Column(name = "beneficiary_id", nullable = false)
    public UUID beneficiaryId;

    @Column(name = "relationship_type")
    public String relationshipType;

    @Column(name = "created_at", nullable = false, updatable = false)
    public LocalDateTime createdAt;

    @PrePersist
    public void prePersist() {
        createdAt = LocalDateTime.now();
    }
}
