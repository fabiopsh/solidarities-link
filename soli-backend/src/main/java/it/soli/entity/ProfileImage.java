package it.soli.entity;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.*;
import java.util.UUID;

@Entity
@Table(name = "soli_profile_images")
public class ProfileImage extends PanacheEntityBase {

    @Id
    public UUID id;

    @Column(name = "user_id", unique = true, nullable = false)
    public UUID userId;

    @Column(name = "data", columnDefinition = "bytea", nullable = false)
    public byte[] data;

    @Column(name = "content_type", nullable = false)
    public String contentType;

    public static ProfileImage findByUserId(UUID userId) {
        return find("userId", userId).firstResult();
    }
}
