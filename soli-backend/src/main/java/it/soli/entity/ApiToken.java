package it.soli.entity;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * An API token that grants read-only access to the public Open Data endpoints
 * (/api/open/**). The plaintext key is shown only once at creation; only its
 * SHA-256 hash is stored. Tokens have a mandatory expiry and can be revoked.
 */
@Entity
@Table(name = "soli_api_tokens")
public class ApiToken extends PanacheEntityBase {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    public UUID id;

    @Column(nullable = false)
    public String label;

    // First characters of the key (e.g. "soli_ab12cd"), safe to display.
    @Column(name = "token_prefix", nullable = false)
    public String tokenPrefix;

    // SHA-256 hex of the full key. The plaintext is never persisted.
    @Column(name = "token_hash", nullable = false, unique = true)
    public String tokenHash;

    @Column(nullable = false)
    public String scope = "read:stats";

    @Column(name = "created_by")
    public UUID createdBy;

    @Column(name = "created_at", nullable = false, updatable = false)
    public LocalDateTime createdAt;

    @Column(name = "expires_at", nullable = false)
    public LocalDateTime expiresAt;

    @Column(name = "last_used_at")
    public LocalDateTime lastUsedAt;

    @Column(nullable = false)
    public Boolean revoked = false;

    @Column(name = "call_count", nullable = false)
    public Long callCount = 0L;

    @PrePersist
    public void prePersist() {
        createdAt = LocalDateTime.now();
    }

    public static ApiToken findByHash(String hash) {
        return find("tokenHash", hash).firstResult();
    }
}
