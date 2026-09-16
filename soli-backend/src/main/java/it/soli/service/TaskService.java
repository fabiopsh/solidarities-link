package it.soli.service;

import it.soli.entity.AuditLog;
import it.soli.entity.AuditEntityType;
import it.soli.entity.Task;
import it.soli.entity.TaskStatus;
import it.soli.entity.UrgencyLevel;
import it.soli.exception.IllegalTaskStateException;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import org.eclipse.microprofile.jwt.JsonWebToken;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.UUID;
import jakarta.enterprise.event.Event;

import io.quarkus.runtime.StartupEvent;
import org.eclipse.microprofile.context.ManagedExecutor;
import jakarta.enterprise.event.Observes;

import java.security.SecureRandom;
import java.util.Base64;

@ApplicationScoped
public class TaskService {

    @Inject
    JsonWebToken jwt;

    @Inject
    MatchingService matchingService;

    @Inject
    ManagedExecutor managedExecutor;

    @Inject
    WalletService walletService;

    @Inject
    Event<Task> taskCreatedEvent;

    private static final SecureRandom secureRandom = new SecureRandom();
    private static final int DAILY_TASK_LIMIT = 5;
    private static final int CANCEL_WINDOW_MINUTES = 10;

    public void onTaskCreatedSuccess(@Observes(during = jakarta.enterprise.event.TransactionPhase.AFTER_SUCCESS) Task task) {
        // Trigger matching asynchronously after the task is committed successfully
        managedExecutor.execute(() -> {
            matchingService.matchAndNotifyVolunteers(task);
        });
    }

    private String generateToken() {
        byte[] tokenBytes = new byte[8]; // 64 bits
        secureRandom.nextBytes(tokenBytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(tokenBytes);
    }

    private UUID getCurrentUserId() {
        String subject = jwt.getSubject();
        if (subject == null) return null;
        it.soli.entity.User user = it.soli.entity.User.findByKeycloakId(subject);
        return user != null ? user.id : null;
    }

    private void logStateChange(Task task, TaskStatus oldStatus, TaskStatus newStatus, UUID actorId) {
        if (oldStatus == newStatus) return;
        
        AuditLog log = new AuditLog();
        log.entityType = AuditEntityType.TASK;
        log.entityId = task.id;
        log.actorId = actorId;
        log.action = "STATUS_CHANGE";
        log.oldValue = "{\"status\":\"" + oldStatus.name() + "\"}";
        log.newValue = "{\"status\":\"" + newStatus.name() + "\"}";
        log.persist();
    }

    @Transactional
    public Task assignTask(UUID taskId, UUID volunteerId) {
        Task task = Task.findById(taskId);
        if (task == null) {
            throw new IllegalArgumentException("Task not found");
        }

        if (task.status != TaskStatus.OPEN) {
            throw new IllegalTaskStateException("Cannot assign task. Current status is " + task.status + ", expected OPEN.");
        }

        // Prevent the volunteer who previously released the task from accepting it again
        java.util.List<AuditLog> logs = AuditLog.find("entityId = ?1 AND action = 'STATUS_CHANGE' AND actorId = ?2", taskId, volunteerId).list();
        boolean hasReleased = logs.stream().anyMatch(log -> 
            log.oldValue != null && log.newValue != null &&
            log.oldValue.contains("\"ACCEPTED\"") && log.newValue.contains("\"OPEN\"")
        );
        if (hasReleased) {
            throw new IllegalTaskStateException("Non puoi riprendere in carico un task a cui hai già rinunciato.");
        }

        TaskStatus oldStatus = task.status;
        task.volunteerId = volunteerId;
        task.status = TaskStatus.ACCEPTED;
        task.acceptedAt = LocalDateTime.now();
        task.checkInToken = generateToken(); // Generate token for check-in

        // Create or reuse a ChatSession for real-time messaging between creator and volunteer
        it.soli.entity.ChatSession session = it.soli.entity.ChatSession.find("taskId", taskId).firstResult();
        if (session == null) {
            session = new it.soli.entity.ChatSession();
            session.taskId = taskId;
            session.isActive = true;
            session.persist();
        } else {
            session.isActive = true;
        }

        logStateChange(task, oldStatus, task.status, getCurrentUserId());
        return task;
    }

    @Transactional
    public Task startTask(UUID taskId) {
        throw new IllegalTaskStateException("Use checkInTask with token to start a task.");
    }

    @Transactional
    public Task checkInTask(UUID taskId, UUID volunteerId, String token) {
        Task task = Task.findById(taskId);
        if (task == null) {
            throw new IllegalArgumentException("Task not found");
        }

        if (task.status != TaskStatus.ACCEPTED) {
            throw new IllegalTaskStateException("Cannot check-in task. Current status is " + task.status + ", expected ACCEPTED.");
        }

        if (!task.volunteerId.equals(volunteerId)) {
            throw new IllegalArgumentException("Only the assigned volunteer can check-in.");
        }

        if (task.checkInToken == null || !task.checkInToken.equals(token)) {
            throw new IllegalTaskStateException("Invalid check-in token.");
        }

        TaskStatus oldStatus = task.status;
        task.status = TaskStatus.IN_PROGRESS;
        task.checkInAt = LocalDateTime.now(); // Record actual start time for credit calculation
        task.checkOutToken = generateToken(); // Generate token for check-out

        logStateChange(task, oldStatus, task.status, getCurrentUserId());
        return task;
    }

    @Transactional
    public Task completeTask(UUID taskId) {
        throw new IllegalTaskStateException("Use checkOutTask with token to complete a task.");
    }

    @Transactional
    public Task checkOutTask(UUID taskId, UUID volunteerId, String token) {
        Task task = Task.findById(taskId);
        if (task == null) {
            throw new IllegalArgumentException("Task not found");
        }

        if (task.status != TaskStatus.IN_PROGRESS) {
            throw new IllegalTaskStateException("Cannot check-out task. Current status is " + task.status + ", expected IN_PROGRESS.");
        }

        if (!task.volunteerId.equals(volunteerId)) {
            throw new IllegalArgumentException("Only the assigned volunteer can check-out.");
        }

        if (task.checkOutToken == null || !task.checkOutToken.equals(token)) {
            throw new IllegalTaskStateException("Invalid check-out token.");
        }

        TaskStatus oldStatus = task.status;
        task.status = TaskStatus.COMPLETED;
        task.checkOutAt = LocalDateTime.now(); // Record actual end time for credit calculation

        logStateChange(task, oldStatus, task.status, getCurrentUserId());

        // Assign credits synchronously within this transaction: atomic and consistent,
        // and any failure surfaces instead of being silently swallowed by an async task.
        walletService.assignCreditsForTask(task);

        return task;
    }

    public long countTasksCreatedToday(UUID creatorId) {
        LocalDateTime startOfDay = LocalDate.now().atStartOfDay();
        LocalDateTime endOfDay = LocalDate.now().atTime(LocalTime.MAX);
        return Task.count("creatorId = ?1 AND createdAt >= ?2 AND createdAt <= ?3",
                creatorId, startOfDay, endOfDay);
    }

    @Transactional
    public Task createTask(Task task) {
        // FR-04: Enforce daily task limit
        long todayCount = countTasksCreatedToday(task.creatorId);
        if (todayCount >= DAILY_TASK_LIMIT) {
            throw new IllegalTaskStateException(
                    "Hai raggiunto il limite massimo di " + DAILY_TASK_LIMIT +
                    " richieste giornaliere. Riprova domani.");
        }

        task.persist();
        
        // Fire the event. The observer with AFTER_SUCCESS will catch it after the transaction commits.
        taskCreatedEvent.fire(task);

        return task;
    }

    /**
     * Creates a task on behalf of an accredited institutional partner (FARO engagement, FR-22).
     * The per-requester daily limit (FR-04) targets individual requesters and does not apply;
     * matching is triggered exactly as for native tasks.
     */
    @Transactional
    public Task createPartnerTask(Task task) {
        task.persist();
        taskCreatedEvent.fire(task);
        return task;
    }

    @Transactional
    public Task cancelTask(UUID taskId, UUID requesterId) {
        Task task = Task.findById(taskId);
        if (task == null) {
            throw new IllegalArgumentException("Task not found");
        }

        if (!task.creatorId.equals(requesterId)) {
            throw new IllegalArgumentException("Only the creator is allowed to cancel the task.");
        }

        // FR-19: Differentiated cancellation rules
        if (task.status == TaskStatus.OPEN || task.status == TaskStatus.NOTIFIED) {
            // Free cancellation if not yet accepted
        } else if (task.status == TaskStatus.ACCEPTED) {
            // Allow cancellation only within 10-minute window
            if (task.acceptedAt == null) {
                throw new IllegalTaskStateException("Cannot cancel: acceptance timestamp missing.");
            }
            LocalDateTime deadline = task.acceptedAt.plusMinutes(CANCEL_WINDOW_MINUTES);
            if (LocalDateTime.now().isAfter(deadline)) {
                throw new IllegalTaskStateException(
                        "Non è più possibile annullare: il tempo limite di " +
                        CANCEL_WINDOW_MINUTES + " minuti è scaduto.");
            }
        } else {
            throw new IllegalTaskStateException(
                    "Cannot cancel task. Current status is " + task.status + ".");
        }

        TaskStatus oldStatus = task.status;
        task.status = TaskStatus.CANCELLED;

        logStateChange(task, oldStatus, task.status, requesterId != null ? requesterId : getCurrentUserId());
        return task;
    }

    @Transactional
    public Task confirmCompletion(UUID taskId, UUID userId) {
        Task task = Task.findById(taskId);
        if (task == null) {
            throw new IllegalArgumentException("Task not found");
        }

        if (task.status != TaskStatus.ACCEPTED && task.status != TaskStatus.IN_PROGRESS) {
            throw new IllegalTaskStateException(
                    "Cannot confirm completion. Current status is " + task.status + ".");
        }

        boolean isCreator = task.creatorId != null && task.creatorId.equals(userId);
        boolean isVolunteer = task.volunteerId != null && task.volunteerId.equals(userId);

        if (!isCreator && !isVolunteer) {
            throw new IllegalArgumentException(
                    "Only the creator or the assigned volunteer can confirm completion.");
        }

        if (isCreator) {
            if (Boolean.TRUE.equals(task.creatorConfirmed)) {
                throw new IllegalTaskStateException("Hai già confermato il completamento.");
            }
            task.creatorConfirmed = true;
        }

        if (isVolunteer) {
            if (Boolean.TRUE.equals(task.volunteerConfirmed)) {
                throw new IllegalTaskStateException("Hai già confermato il completamento.");
            }
            task.volunteerConfirmed = true;
        }

        // If both confirmed, transition to COMPLETED
        if (Boolean.TRUE.equals(task.creatorConfirmed) && Boolean.TRUE.equals(task.volunteerConfirmed)) {
            TaskStatus oldStatus = task.status;
            task.status = TaskStatus.COMPLETED;

            // The double-confirmation flow completes the task without the token-based
            // check-in/check-out. Populate the timestamps so credits can be computed from
            // the effective duration (WalletService caps it to a sane maximum).
            if (task.checkInAt == null) {
                task.checkInAt = task.acceptedAt != null ? task.acceptedAt : LocalDateTime.now();
            }
            if (task.checkOutAt == null) {
                task.checkOutAt = LocalDateTime.now();
            }

            logStateChange(task, oldStatus, task.status, userId);

            // Assign credits synchronously within this transaction (atomic, errors visible).
            walletService.assignCreditsForTask(task);
        }

        return task;
    }

    @Transactional
    public Task releaseTask(UUID taskId, UUID volunteerId) {
        Task task = Task.findById(taskId);
        if (task == null) {
            throw new IllegalArgumentException("Task not found");
        }

        if (task.status != TaskStatus.ACCEPTED) {
            throw new IllegalTaskStateException("Cannot release task. Current status is " + task.status + ", expected ACCEPTED.");
        }

        if (!task.volunteerId.equals(volunteerId)) {
            throw new IllegalArgumentException("Only the assigned volunteer can release the task.");
        }

        TaskStatus oldStatus = task.status;
        task.volunteerId = null;
        task.acceptedAt = null;
        task.checkInToken = null;
        task.checkOutToken = null;
        task.status = TaskStatus.OPEN;

        // Increase criticality by one step
        if (task.urgencyLevel == UrgencyLevel.LOW) {
            task.urgencyLevel = UrgencyLevel.MEDIUM;
        } else if (task.urgencyLevel == UrgencyLevel.MEDIUM) {
            task.urgencyLevel = UrgencyLevel.HIGH;
        } else if (task.urgencyLevel == UrgencyLevel.HIGH) {
            task.urgencyLevel = UrgencyLevel.CRITICAL;
        }

        logStateChange(task, oldStatus, task.status, volunteerId);

        // Restart matching
        managedExecutor.execute(() -> {
            matchingService.matchAndNotifyVolunteers(task);
        });

        return task;
    }
}
