package it.soli.entity;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "soli_users")
public class User extends PanacheEntityBase {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    public UUID id;

    @Column(name = "keycloak_id", unique = true)
    public String keycloakId;

    @Column(unique = true, nullable = false)
    public String email;

    @Column(name = "first_name")
    public String firstName;

    @Column(name = "last_name")
    public String lastName;

    @Column(name = "fiscal_code", unique = true)
    public String fiscalCode;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    public UserRole role = UserRole.USER;

    @Enumerated(EnumType.STRING)
    @Column(name = "certification_level")
    public CertificationLevel certificationLevel;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    public UserStatus status = UserStatus.ACTIVE;

    // For simplicity without PostGIS, storing as String (e.g. "lat,lon") or JSON
    // If PostGIS is available, this should be a Geometry/Point type.
    @Column(name = "last_known_location")
    public String lastKnownLocation;

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

    // --- Panache finder methods ---

    public static User findByKeycloakId(String keycloakId) {
        return find("keycloakId", keycloakId).firstResult();
    }

    public static User findByEmail(String email) {
        return find("email", email).firstResult();
    }
}
