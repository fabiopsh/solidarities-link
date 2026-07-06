package it.soli.entity;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * A real benefit organization ("ente benefico") that issues vouchers ("buoni")
 * redeemable with SOLI credits. Referenced by SPEND_DONATION transactions on redemption.
 */
@Entity
@Table(name = "soli_charities")
public class Charity extends PanacheEntityBase {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    public UUID id;

    @Column(nullable = false)
    public String name;

    @Column(columnDefinition = "TEXT")
    public String description;

    @Column(name = "cause")
    public String cause;

    @Column(name = "voucher_label", nullable = false)
    public String voucherLabel;

    @Column(name = "cost_in_credits", nullable = false)
    public Integer costInCredits;

    @Column(name = "stock_remaining", nullable = false)
    public Integer stockRemaining = 0;

    @Column(name = "is_active", nullable = false)
    public Boolean isActive = true;

    @Column(name = "created_at", nullable = false, updatable = false)
    public LocalDateTime createdAt;

    @PrePersist
    public void prePersist() {
        createdAt = LocalDateTime.now();
    }
}
