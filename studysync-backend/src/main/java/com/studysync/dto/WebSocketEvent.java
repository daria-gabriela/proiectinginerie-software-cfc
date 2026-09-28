package com.studysync.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

/**
 * WebSocket event for real-time updates.
 * Used for document processing, chat, comments, and general notifications.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WebSocketEvent {

    /**
     * Event types for different real-time updates
     */
    public enum EventType {
        // Document processing events
        DOCUMENT_UPLOADING,
        DOCUMENT_CONVERTING,
        DOCUMENT_INDEXING,
        DOCUMENT_READY,
        DOCUMENT_ERROR,
        DOCUMENT_DELETED,

        // Chat events
        CHAT_MESSAGE,

        // Comment events
        COMMENT_ADDED,
        COMMENT_UPDATED,
        COMMENT_DELETED,

        // Member events
        MEMBER_JOINED,
        MEMBER_LEFT
    }

    private EventType type;
    private String spaceId;
    private String documentId;
    private String userId;
    private String message;
    private Object payload; // Additional data (document, chat message, etc.)
    private Instant timestamp;

    /**
     * Create a document processing event
     */
    public static WebSocketEvent documentEvent(EventType type, String spaceId, String documentId, String message,
            Object payload) {
        return WebSocketEvent.builder()
                .type(type)
                .spaceId(spaceId)
                .documentId(documentId)
                .message(message)
                .payload(payload)
                .timestamp(Instant.now())
                .build();
    }

    /**
     * Create a chat message event
     */
    public static WebSocketEvent chatEvent(String spaceId, Object chatMessage) {
        return WebSocketEvent.builder()
                .type(EventType.CHAT_MESSAGE)
                .spaceId(spaceId)
                .payload(chatMessage)
                .timestamp(Instant.now())
                .build();
    }
}
