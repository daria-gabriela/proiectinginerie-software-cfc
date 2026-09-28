package com.studysync.service;

import com.studysync.dto.ChatMessageDTO;
import com.studysync.dto.WebSocketEvent;
import com.studysync.model.ChatMessage;
import com.studysync.repository.ChatMessageRepository;
import com.studysync.repository.SpaceMembershipRepository;
import com.studysync.repository.UserRepository;
import com.studysync.security.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Collections;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ChatService {

    private final ChatMessageRepository chatMessageRepository;
    private final SpaceMembershipRepository membershipRepository;
    private final UserRepository userRepository;
    private final WebSocketService webSocketService;

    public List<ChatMessageDTO> getMessages(String spaceId) {
        requireMembership(spaceId);

        // Get last 100 messages, ordered by newest first
        List<ChatMessage> messages = chatMessageRepository.findTop100BySpaceIdOrderByCreatedAtDesc(spaceId);

        // Reverse to show oldest first (chronological order)
        Collections.reverse(messages);

        return messages.stream()
                .map(this::toDTO)
                .toList();
    }

    public ChatMessageDTO sendMessage(String spaceId, String content) {
        requireMembership(spaceId);
        String userId = SecurityUtils.getCurrentUserId();

        ChatMessage message = ChatMessage.builder()
                .spaceId(spaceId)
                .authorUserId(userId)
                .content(content)
                .createdAt(Instant.now())
                .build();

        message = chatMessageRepository.save(message);
        ChatMessageDTO dto = toDTO(message);

        // Broadcast message to all subscribers via WebSocket
        webSocketService.sendChatMessage(WebSocketEvent.chatEvent(spaceId, dto));

        return dto;
    }

    private void requireMembership(String spaceId) {
        String userId = SecurityUtils.getCurrentUserId();
        if (membershipRepository.findBySpaceIdAndUserId(spaceId, userId).isEmpty()) {
            throw new IllegalStateException("Not a member of this space");
        }
    }

    private ChatMessageDTO toDTO(ChatMessage message) {
        String authorName = userRepository.findById(message.getAuthorUserId())
                .map(u -> u.getFirstName() + " " + u.getLastName())
                .orElse("Unknown");

        return ChatMessageDTO.builder()
                .id(message.getId())
                .spaceId(message.getSpaceId())
                .authorUserId(message.getAuthorUserId())
                .authorName(authorName)
                .content(message.getContent())
                .createdAt(message.getCreatedAt())
                .build();
    }
}
