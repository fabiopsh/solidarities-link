package it.soli.entity;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "soli_chat_messages")
public class ChatMessage extends PanacheEntityBase {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    public UUID id;

    @Column(name = "chat_session_id", nullable = false)
    public UUID chatSessionId;

    @Column(name = "sender_id", nullable = false)
    public UUID senderId;

    @Column(columnDefinition = "TEXT", nullable = false)
    public String content;

    @Column(name = "is_flagged", nullable = false)
    public Boolean isFlagged = false;

    @Column(name = "sent_at", nullable = false, updatable = false)
    public LocalDateTime sentAt;

    @PrePersist
    public void prePersist() {
        sentAt = LocalDateTime.now();
    }
}
