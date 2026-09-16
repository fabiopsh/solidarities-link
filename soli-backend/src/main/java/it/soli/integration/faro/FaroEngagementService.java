package it.soli.integration.faro;

import it.soli.entity.ServiceCategory;
import it.soli.entity.Task;
import it.soli.entity.TaskStatus;
import it.soli.entity.UrgencyLevel;
import it.soli.entity.User;
import it.soli.integration.faro.dto.FaroEngageRequest;
import it.soli.integration.faro.dto.FaroEngageResponse;
import it.soli.service.MatchingService;
import it.soli.service.TaskService;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;

import java.time.LocalDateTime;
import java.util.*;

/**
 * Turns an engagement from FARO's Binder into SOLI support tasks.
 * Outcomes follow the fallback policy of FARO's Binder: 200 engaged, 409 duplicate engagement,
 * 503 no eligible volunteer (the Binder discards SOLI and tries the next candidate).
 */
@ApplicationScoped
public class FaroEngagementService {

    public static class EngageRejected extends RuntimeException {
        public final int status;

        public EngageRejected(int status, String message) {
            super(message);
            this.status = status;
        }
    }

    record CapabilityProfile(ServiceCategory category, String label) {
    }

    static final Map<String, CapabilityProfile> CAPABILITY_PROFILES = Map.of(
            "ElderlyAssistance", new CapabilityProfile(ServiceCategory.PHYSICAL_SUPPORT, "Assistenza a persone fragili evacuate"),
            "TransportAssistance", new CapabilityProfile(ServiceCategory.MOBILITY, "Accompagnamento di persone evacuate"),
            "LogisticSupport", new CapabilityProfile(ServiceCategory.PHYSICAL_SUPPORT, "Supporto logistico al punto di raccolta"),
            "PetAssistance", new CapabilityProfile(ServiceCategory.PET_SUPPORT, "Custodia degli animali delle famiglie evacuate"),
            "PsychosocialSupport", new CapabilityProfile(ServiceCategory.SOCIAL, "Compagnia e supporto alle persone evacuate"));

    static final Map<String, String> CATEGORY_LABELS = Map.of(
            "FIRE", "Incendio",
            "FLOOD", "Alluvione",
            "CAR_CRASH", "Incidente stradale",
            "HEALTH_CRISIS", "Emergenza sanitaria",
            "UNKNOWN", "Emergenza");

    private static final int MAX_VOLUNTEERS_PER_ENGAGEMENT = 5;

    @Inject
    MatchingService matchingService;

    @Inject
    TaskService taskService;

    @Inject
    FaroConfig config;

    @Transactional
    public FaroEngageResponse engage(FaroEngageRequest req) {
        if (req == null || req.emergencyId() == null || req.eventId() == null || req.eventType() == null
                || req.latitude() == null || req.longitude() == null || req.capability() == null) {
            throw new EngageRejected(400, "emergencyId, eventId, eventType, latitude, longitude e capability sono obbligatori");
        }
        CapabilityProfile profile = CAPABILITY_PROFILES.get(req.capability());
        if (profile == null) {
            throw new EngageRejected(400, "Capability non offerta da SOLI: " + req.capability());
        }

        long alreadyEngaged = Task.count("faroEmergencyId = ?1 AND category = ?2 AND status IN ?3",
                req.emergencyId(), profile.category(),
                List.of(TaskStatus.OPEN, TaskStatus.NOTIFIED, TaskStatus.ACCEPTED, TaskStatus.IN_PROGRESS));
        if (alreadyEngaged > 0) {
            throw new EngageRejected(409, "SOLI è già ingaggiato su questa emergenza per " + req.capability());
        }

        FaroEngageRequest.MeetingPoint meetingPoint = req.meetingPoint() != null && req.meetingPoint().latitude() != null
                ? req.meetingPoint()
                : defaultMeetingPoint(req);

        List<MatchingService.MatchedVolunteer> candidates = matchingService.findCandidates(
                profile.category(), meetingPoint.latitude(), meetingPoint.longitude());
        if (candidates.isEmpty()) {
            throw new EngageRejected(503, "Nessun volontario disponibile con competenza " + profile.category() + " nel raggio d'azione");
        }

        int requested = req.requestedVolunteers() == null ? 1 : req.requestedVolunteers();
        int toCreate = Math.max(1, Math.min(Math.min(requested, MAX_VOLUNTEERS_PER_ENGAGEMENT), candidates.size()));
        User system = FaroSystemUser.getOrCreate();
        String categoryLabel = CATEGORY_LABELS.getOrDefault(req.eventType(), "Emergenza");

        List<UUID> taskIds = new ArrayList<>();
        for (int i = 0; i < toCreate; i++) {
            Task task = new Task();
            task.creatorId = system.id;
            task.beneficiaryId = system.id;
            task.category = profile.category();
            task.title = "[FARO] " + profile.label() + (toCreate > 1 ? " (" + (i + 1) + "/" + toCreate + ")" : "");
            task.description = description(req, profile, categoryLabel, meetingPoint);
            task.urgencyLevel = urgencyFor(req.severity());
            task.scheduledAt = LocalDateTime.now();
            task.hasScheduledTime = true;
            task.targetLocation = meetingPoint.address();
            task.targetAddress = meetingPoint.address();
            task.latitude = meetingPoint.latitude();
            task.longitude = meetingPoint.longitude();
            task.externalSource = "FARO";
            task.faroEmergencyId = req.emergencyId();
            task.faroEventId = req.eventId();
            taskService.createPartnerTask(task);
            taskIds.add(task.id);
        }

        trackEmergency(req);

        double nearest = candidates.stream().mapToDouble(c -> c.distanceMeters).min().orElse(0);
        int eta = (int) Math.round(10 + nearest / 400.0);
        return new FaroEngageResponse(UUID.randomUUID(), "ENGAGED", "SOLI - Solidarities Link", req.capability(),
                taskIds, candidates.size(), eta, meetingPoint.address());
    }

    private void trackEmergency(FaroEngageRequest req) {
        FaroEmergency e = FaroEmergency.findByEventId(req.eventId());
        LocalDateTime now = LocalDateTime.now();
        if (e == null) {
            e = new FaroEmergency();
            e.eventId = req.eventId();
            e.category = req.eventType();
            e.severity = req.severity() != null ? req.severity() : "MEDIUM";
            e.latitude = req.latitude();
            e.longitude = req.longitude();
            e.address = req.address();
            e.firstSeenAt = now;
        }
        e.faroEmergencyId = req.emergencyId();
        e.workflowInstanceId = req.workflowInstanceId();
        e.engaged = true;
        e.active = true;
        e.lastUpdateAt = now;
        e.persist();
    }

    private FaroEngageRequest.MeetingPoint defaultMeetingPoint(FaroEngageRequest req) {
        int distance = GeoUtils.riskRadiusMeters(req.severity(), config.safetyRadiusMeters()) + 400;
        return new FaroEngageRequest.MeetingPoint(
                GeoUtils.latitudeNorthOf(req.latitude(), distance), req.longitude(),
                "Area di attesa Protezione Civile, " + distance + " m a nord di " + Objects.toString(req.address(), "area evento"));
    }

    private static UrgencyLevel urgencyFor(String severity) {
        return switch (severity == null ? "" : severity) {
            case "CRITICAL" -> UrgencyLevel.CRITICAL;
            case "HIGH", "MEDIUM" -> UrgencyLevel.HIGH;
            default -> UrgencyLevel.MEDIUM;
        };
    }

    private static String description(FaroEngageRequest req, CapabilityProfile profile, String categoryLabel,
                                      FaroEngageRequest.MeetingPoint meetingPoint) {
        StringBuilder sb = new StringBuilder()
                .append("Richiesta di supporto inviata da FARO (Protezione Civile) per l'emergenza \"")
                .append(categoryLabel).append("\" in ").append(Objects.toString(req.address(), "zona segnalata"))
                .append(", gravità ").append(Objects.toString(req.severity(), "n.d.")).append(".\n")
                .append("Attività richiesta: ").append(profile.label()).append(".\n")
                .append("Presentati SOLO al punto di raccolta sicuro: ").append(meetingPoint.address()).append(".\n")
                .append("Non avvicinarti all'area dell'emergenza e segui le indicazioni degli operatori.\n")
                .append("Riferimento FARO: emergenza #").append(req.emergencyId());
        if (req.workflowInstanceId() != null) {
            sb.append(", piano ").append(req.workflowInstanceId());
        }
        if (req.notes() != null && !req.notes().isBlank()) {
            sb.append("\nNote della sala operativa: ").append(req.notes());
        }
        return sb.toString();
    }
}
