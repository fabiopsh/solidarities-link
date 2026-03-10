package it.soli.service;

import it.soli.entity.AuditLog;
import it.soli.entity.AuditEntityType;
import it.soli.entity.Task;
import it.soli.entity.TaskStatus;
import it.soli.exception.IllegalTaskStateException;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import org.eclipse.microprofile.jwt.JsonWebToken;

import java.util.UUID;

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

    private static final SecureRandom secureRandom = new SecureRandom();

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

        TaskStatus oldStatus = task.status;
        task.volunteerId = volunteerId;
        task.status = TaskStatus.ACCEPTED;
        task.checkInToken = generateToken(); // Generate token for check-in

        // Create a ChatSession for real-time messaging between creator and volunteer
        it.soli.entity.ChatSession session = new it.soli.entity.ChatSession();
        session.taskId = taskId;
        session.isActive = true;
        session.persist();

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

        logStateChange(task, oldStatus, task.status, getCurrentUserId());
        
        // Asynchronously assign credits to the volunteer
        managedExecutor.execute(() -> {
            walletService.assignCreditsForTask(task);
        });

        return task;
    }

    @Transactional
    public Task createTask(Task task) {
        task.persist();
        
        // Trigger matching asynchronously to avoid blocking the client per NFR-04
        managedExecutor.execute(() -> {
            matchingService.matchAndNotifyVolunteers(task);
        });

        return task;
    }

    @Transactional
    public Task cancelTask(UUID taskId, UUID requesterId) {
        Task task = Task.findById(taskId);
        if (task == null) {
            throw new IllegalArgumentException("Task not found");
        }

        if (task.status == TaskStatus.IN_PROGRESS || task.status == TaskStatus.COMPLETED ||
            task.status == TaskStatus.RELEASED || task.status == TaskStatus.CANCELLED) {
            throw new IllegalTaskStateException("Cannot cancel task. Current status is " + task.status + ".");
        }

        if (!task.creatorId.equals(requesterId)) {
            throw new IllegalArgumentException("Only the creator is allowed to cancel the task.");
        }

        TaskStatus oldStatus = task.status;
        task.status = TaskStatus.CANCELLED;

        logStateChange(task, oldStatus, task.status, requesterId != null ? requesterId : getCurrentUserId());
        return task;
    }
}
