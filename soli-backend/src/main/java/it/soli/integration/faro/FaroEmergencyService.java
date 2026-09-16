package it.soli.integration.faro;

import it.soli.entity.AuditEntityType;
import it.soli.entity.AuditLog;
import it.soli.entity.Task;
import it.soli.entity.TaskStatus;
import it.soli.integration.faro.dto.FaroEmergencyStatus;
import it.soli.integration.faro.dto.FaroStreamEvent;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.transaction.Transactional;
import org.jboss.logging.Logger;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/** Maintains {@link FaroEmergency} from FARO's stream and emergency status, and closes FARO tasks accordingly. */
@ApplicationScoped
public class FaroEmergencyService {

    private static final Logger LOG = Logger.getLogger(FaroEmergencyService.class);

    @Transactional
    public int upsertFromStream(List<FaroStreamEvent> events) {
        LocalDateTime now = LocalDateTime.now();
        for (FaroStreamEvent ev : events) {
            if (ev.eventId() == null || ev.coordinates() == null) continue;
            FaroEmergency e = FaroEmergency.findByEventId(ev.eventId());
            if (e == null) {
                e = new FaroEmergency();
                e.eventId = ev.eventId();
                e.firstSeenAt = now;
            } else if ("CLOSED".equals(e.faroStatus)) {
                continue; // late message for an emergency already closed on FARO
            }
            e.category = ev.emergencyCategory();
            e.severity = ev.severity();
            e.latitude = ev.coordinates().latitude();
            e.longitude = ev.coordinates().longitude();
            e.address = ev.address();
            e.confidence = ev.globalConfidence();
            if (ev.incidentContext() != null) {
                e.hasInjured = ev.incidentContext().hasInjured();
                e.hasUnconscious = ev.incidentContext().hasUnconscious();
                e.hasTrapped = ev.incidentContext().hasTrapped();
            }
            e.active = true;
            e.lastUpdateAt = now;
            e.persist();
        }
        return events.size();
    }

    /** Non-engaged emergencies that FARO stopped re-publishing are no longer shown. */
    @Transactional
    public long expireStale(int ttlSeconds) {
        return FaroEmergency.update("active = false WHERE active = true AND engaged = false AND lastUpdateAt < ?1",
                LocalDateTime.now().minusSeconds(ttlSeconds));
    }

    @Transactional
    public List<Long> engagedEmergencyIds() {
        return FaroEmergency.<FaroEmergency>list("active = true AND engaged = true AND faroEmergencyId IS NOT NULL")
                .stream().map(e -> e.faroEmergencyId).distinct().toList();
    }

    @Transactional
    public void applyStatus(FaroEmergencyStatus status) {
        List<FaroEmergency> rows = FaroEmergency.list("faroEmergencyId", status.id());
        if (status.eventId() != null && rows.stream().noneMatch(e -> status.eventId().equals(e.eventId))) {
            // The id now designates a different emergency on FARO: ours is gone
            markUnknown(status.id());
            return;
        }
        for (FaroEmergency e : rows) {
            e.faroStatus = status.status();
            e.severity = status.severity() != null ? status.severity() : e.severity;
            e.workflowInstanceId = status.workflowInstanceId();
            e.lastUpdateAt = LocalDateTime.now();
            if ("CLOSED".equals(status.status())) {
                e.active = false;
            }
        }
        if ("CLOSED".equals(status.status())) {
            cancelPendingTasks(status.id(), "Emergenza chiusa su FARO");
        }
    }

    /** FARO no longer knows the emergency (404): stop tracking it. */
    @Transactional
    public void markUnknown(long faroEmergencyId) {
        FaroEmergency.update("active = false WHERE faroEmergencyId = ?1", faroEmergencyId);
        cancelPendingTasks(faroEmergencyId, "Emergenza non più presente su FARO");
    }

    private void cancelPendingTasks(long faroEmergencyId, String reason) {
        List<Task> pending = Task.list("faroEmergencyId = ?1 AND status IN ?2",
                faroEmergencyId, List.of(TaskStatus.OPEN, TaskStatus.NOTIFIED));
        UUID actor = FaroSystemUser.id();
        for (Task task : pending) {
            TaskStatus old = task.status;
            task.status = TaskStatus.CANCELLED;
            AuditLog log = new AuditLog();
            log.entityType = AuditEntityType.TASK;
            log.entityId = task.id;
            log.actorId = actor;
            log.action = "STATUS_CHANGE";
            log.oldValue = "{\"status\":\"" + old.name() + "\"}";
            log.newValue = "{\"status\":\"CANCELLED\",\"reason\":\"" + reason + "\"}";
            log.persist();
        }
        if (!pending.isEmpty()) {
            LOG.infof("[FARO] emergency %d closed: %d pending FARO tasks cancelled", faroEmergencyId, pending.size());
        }
    }
}
