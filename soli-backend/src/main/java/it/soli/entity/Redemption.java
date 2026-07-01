package it.soli.entity;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * A voucher ("buono") issued to a user when they redeem credits at a {@link Charity}.
 * Tracks the generated voucher code and the credits spent.
 */
@Entity
@Table(name = "soli_redemptions")
public class Redemption extends PanacheEntityBase {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    public UUID id;

    @Column(name = "user_id", nullable = false)
    public UUID userId;

    @Column(name = "charity_id", nullable = false)
    public UUID charityId;

    @Column(name = "voucher_code", nullable = false, unique = true)
    public String voucherCode;

    @Column(name = "credits_spent", nullable = false)
    public Integer creditsSpent;

    @Column(name = "created_at", nullable = false, updatable = false)
    public LocalDateTime createdAt;

    @PrePersist
    public void prePersist() {
        createdAt = LocalDateTime.now();
    }
}
