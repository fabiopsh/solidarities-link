package it.soli.service;

import io.quarkus.hibernate.orm.panache.PanacheQuery;
import it.soli.entity.Task;
import it.soli.entity.TaskNotification;
import it.soli.entity.NotificationStatus;
import it.soli.entity.ServiceCategory;
import it.soli.entity.VolunteerProfile;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.transaction.Transactional;

import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

@ApplicationScoped
public class MatchingService {

    private static final int EARTH_RADIUS_METERS = 6371000;

    /**
     * Finds candidates, scores and sorts them, and creates TaskNotification entities
     * asynchronously or within the same transaction.
     */
    @Transactional(Transactional.TxType.REQUIRES_NEW)
    @jakarta.enterprise.context.control.ActivateRequestContext
    public void matchAndNotifyVolunteers(Task task) {
        if (task.latitude == null || task.longitude == null) {
            return; // Cannot perform geo-matching
        }

        List<MatchedVolunteer> candidates = findCandidates(task.category, task.latitude, task.longitude);

        // For fair rotation, we count how many notifications a volunteer has already received
        // This is a simple proxy for "fewer recent assigned tasks" avoiding overload.
        for (MatchedVolunteer mv : candidates) {
            mv.previousNotifications = TaskNotification.count("volunteerId", mv.profile.userId);
        }

        // 3 & 4. Sort primarily by proximity, secondarily by fair rotation
        candidates.sort(Comparator
                .comparingDouble((MatchedVolunteer mv) -> mv.distanceMeters)
                .thenComparingLong(mv -> mv.previousNotifications));

        // Limit the number of notified volunteers to avoid spamming everyone
        int limit = 10;
        List<MatchedVolunteer> topCandidates = candidates.stream().limit(limit).collect(Collectors.toList());

        // Create notifications
        for (MatchedVolunteer mv : topCandidates) {
            TaskNotification notification = new TaskNotification();
            notification.taskId = task.id;
            notification.volunteerId = mv.profile.userId;
            notification.status = NotificationStatus.PENDING;
            notification.persist();
        }
    }

    /**
     * Volunteers competent for the category whose action radius covers the given point
     * (steps 1-2 of the matching). Also used to pre-check partner engagements (FARO).
     */
    public List<MatchedVolunteer> findCandidates(ServiceCategory category, double latitude, double longitude) {
        List<VolunteerProfile> allActiveProfiles = VolunteerProfile.listAll();

        return allActiveProfiles.stream()
                // 1. Filter by competency
                .filter(profile -> profile.serviceCategories != null && profile.serviceCategories.contains(category))
                // Must have location
                .filter(profile -> profile.latitude != null && profile.longitude != null)
                // Filter by constraints (e.g. physical compatibility could go here if implemented as logic)
                .map(profile -> {
                    double distance = calculateHaversineDistance(
                            latitude, longitude,
                            profile.latitude, profile.longitude);
                    return new MatchedVolunteer(profile, distance);
                })
                // 2. Filter by proximity (in max radius)
                .filter(mv -> mv.distanceMeters <= mv.profile.maxTaskDistanceMeters)
                .collect(Collectors.toList());
    }

    private double calculateHaversineDistance(double lat1, double lon1, double lat2, double lon2) {
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);

        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2)) *
                        Math.sin(dLon / 2) * Math.sin(dLon / 2);

        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return EARTH_RADIUS_METERS * c;
    }

    public static class MatchedVolunteer {
        public VolunteerProfile profile;
        public double distanceMeters;
        long previousNotifications;

        MatchedVolunteer(VolunteerProfile profile, double distanceMeters) {
            this.profile = profile;
            this.distanceMeters = distanceMeters;
        }
    }
}
