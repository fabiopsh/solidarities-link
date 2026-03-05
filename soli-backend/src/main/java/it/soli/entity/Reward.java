package it.soli.entity;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.*;
import java.util.UUID;

@Entity
@Table(name = "soli_rewards")
public class Reward extends PanacheEntityBase {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    public UUID id;

    @Column(nullable = false)
    public String title;

    @Column(columnDefinition = "TEXT")
    public String description;

    @Column(name = "cost_in_credits", nullable = false)
    public Integer costInCredits;

    @Column(name = "partner_name")
    public String partnerName;

    @Column(name = "stock_limit")
    public Integer stockLimit;

    @Column(name = "is_active", nullable = false)
    public Boolean isActive = true;
}
