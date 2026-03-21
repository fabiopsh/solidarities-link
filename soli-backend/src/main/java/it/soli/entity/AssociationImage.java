package it.soli.entity;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.*;
import java.util.UUID;

@Entity
@Table(name = "soli_association_images")
public class AssociationImage extends PanacheEntityBase {

    @Id
    public UUID id;

    @Column(name = "association_id", unique = true, nullable = false)
    public UUID associationId;

    @Column(name = "data", columnDefinition = "bytea", nullable = false)
    public byte[] data;

    @Column(name = "content_type", nullable = false)
    public String contentType;

    public static AssociationImage findByAssociationId(UUID associationId) {
        return find("associationId", associationId).firstResult();
    }
}
