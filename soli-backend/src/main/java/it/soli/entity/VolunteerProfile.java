package it.soli.entity;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.*;
import java.util.UUID;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.util.List;

@Entity
@Table(name = "soli_volunteer_profiles")
public class VolunteerProfile extends PanacheEntityBase {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    public UUID id;

    @Column(name = "user_id", unique = true, nullable = false)
    public UUID userId;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "availability_schedule", columnDefinition = "jsonb")
    public String availabilitySchedule;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "soli_volunteer_service_categories", joinColumns = @JoinColumn(name = "volunteer_profile_id"))
    @Enumerated(EnumType.STRING)
    @Column(name = "category")
    public List<ServiceCategory> serviceCategories;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "constraints_json", columnDefinition = "jsonb")
    public String constraints;

    @Column(name = "max_task_distance_meters")
    public Integer maxTaskDistanceMeters = 5000;

    @Column(name = "last_latitude")
    public Double lastLatitude;

    @Column(name = "last_longitude")
    public Double lastLongitude;

    public static VolunteerProfile findByUserId(UUID userId) {
        return find("userId", userId).firstResult();
    }
}
