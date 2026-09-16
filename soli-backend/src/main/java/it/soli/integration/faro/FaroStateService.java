package it.soli.integration.faro;

import it.soli.entity.Task;
import it.soli.entity.TaskStatus;
import it.soli.entity.VolunteerProfile;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.transaction.Transactional;

import java.time.LocalDateTime;
import java.util.List;

/** Short transactions on {@link FaroIntegrationState}, kept outside the (slow) remote calls. */
@ApplicationScoped
public class FaroStateService {

    public record Snapshot(Long faroUserId, Long faroServiceId, String registeredCapabilities, LocalDateTime registeredAt,
                           LocalDateTime lastHeartbeatAt, String lastStatus, Double lastLoad, Double avgEngageLatencyMs) {
    }

    public record Load(long volunteers, long busyVolunteers) {
        public double ratio() {
            return volunteers == 0 ? 1.0 : Math.min(1.0, (double) busyVolunteers / volunteers);
        }
    }

    @Transactional(Transactional.TxType.REQUIRES_NEW)
    public Snapshot snapshot() {
        FaroIntegrationState s = FaroIntegrationState.getOrCreate();
        return new Snapshot(s.faroUserId, s.faroServiceId, s.registeredCapabilities, s.registeredAt,
                s.lastHeartbeatAt, s.lastStatus, s.lastLoad, s.avgEngageLatencyMs);
    }

    @Transactional(Transactional.TxType.REQUIRES_NEW)
    public void saveUserId(Long faroUserId) {
        FaroIntegrationState.getOrCreate().faroUserId = faroUserId;
    }

    @Transactional(Transactional.TxType.REQUIRES_NEW)
    public void saveRegistration(Long faroServiceId, List<String> capabilities) {
        FaroIntegrationState s = FaroIntegrationState.getOrCreate();
        s.faroServiceId = faroServiceId;
        s.registeredCapabilities = String.join(",", capabilities);
        s.registeredAt = LocalDateTime.now();
    }

    @Transactional(Transactional.TxType.REQUIRES_NEW)
    public void saveHeartbeat(String status, double load) {
        FaroIntegrationState s = FaroIntegrationState.getOrCreate();
        s.lastHeartbeatAt = LocalDateTime.now();
        s.lastStatus = status;
        s.lastLoad = load;
    }

    @Transactional(Transactional.TxType.REQUIRES_NEW)
    public void recordEngageLatency(long millis) {
        FaroIntegrationState s = FaroIntegrationState.getOrCreate();
        double previous = s.avgEngageLatencyMs == null ? 0.0 : s.avgEngageLatencyMs;
        s.avgEngageLatencyMs = previous == 0.0 ? millis : 0.7 * previous + 0.3 * millis;
    }

    /** Share of volunteers currently committed to an accepted or running task: FARO's currentLoad. */
    @Transactional(Transactional.TxType.REQUIRES_NEW)
    public Load currentLoad() {
        long volunteers = VolunteerProfile.count();
        Long busy = Task.getEntityManager()
                .createQuery("select count(distinct t.volunteerId) from Task t where t.status in :statuses", Long.class)
                .setParameter("statuses", List.of(TaskStatus.ACCEPTED, TaskStatus.IN_PROGRESS))
                .getSingleResult();
        return new Load(volunteers, busy == null ? 0 : busy);
    }
}
