package com.studysync.service;

import com.studysync.dto.WebSocketEvent;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

/**
 * Service for sending real-time WebSocket events to clients.
 * 
 * Channel structure:
 * - /topic/space/{spaceId}/documents - Document events for a space
 * - /topic/space/{spaceId}/chat - Chat messages for a space
 * - /topic/space/{spaceId}/comments - Comment events for a space
 * - /user/queue/notifications - Private notifications for a user
 */
@Service
@RequiredArgsConstructor
public class WebSocketService {

    private static final Logger log = LoggerFactory.getLogger(WebSocketService.class);
    private final SimpMessagingTemplate messagingTemplate;

    /**
     * Send a document-related event to all subscribers of a space
     */
    public void sendDocumentEvent(WebSocketEvent event) {
        String destination = "/topic/space/" + event.getSpaceId() + "/documents";
        log.debug("Sending document event to {}: {}", destination, event.getType());
        messagingTemplate.convertAndSend(destination, event);
    }

    /**
     * Send a chat message to all subscribers of a space
     */
    public void sendChatMessage(WebSocketEvent event) {
        String destination = "/topic/space/" + event.getSpaceId() + "/chat";
        log.debug("Sending chat message to {}", destination);
        messagingTemplate.convertAndSend(destination, event);
    }

    /**
     * Send a comment event to all subscribers of a space
     */
    public void sendCommentEvent(WebSocketEvent event) {
        String destination = "/topic/space/" + event.getSpaceId() + "/comments";
        log.debug("Sending comment event to {}: {}", destination, event.getType());
        messagingTemplate.convertAndSend(destination, event);
    }

    /**
     * Send a private notification to a specific user
     */
    public void sendToUser(String userId, WebSocketEvent event) {
        String destination = "/queue/notifications";
        log.debug("Sending private notification to user {}", userId);
        messagingTemplate.convertAndSendToUser(userId, destination, event);
    }

    /**
     * Broadcast an event to all subscribers of a space (general purpose)
     */
    public void broadcastToSpace(String spaceId, String channel, WebSocketEvent event) {
        String destination = "/topic/space/" + spaceId + "/" + channel;
        log.debug("Broadcasting to {}: {}", destination, event.getType());
        messagingTemplate.convertAndSend(destination, event);
    }
}
