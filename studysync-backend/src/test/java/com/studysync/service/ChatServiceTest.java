package com.studysync.service;

import com.studysync.dto.ChatMessageDTO;
import com.studysync.dto.WebSocketEvent;
import com.studysync.model.ChatMessage;
import com.studysync.model.SpaceMembership;
import com.studysync.model.User;
import com.studysync.repository.ChatMessageRepository;
import com.studysync.repository.SpaceMembershipRepository;
import com.studysync.repository.UserRepository;
import com.studysync.security.SecurityUtils;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

/**
 * Teste unitare pentru ChatService
 * 
 * Aceste teste verifică:
 * - Obținerea mesajelor dintr-un spațiu de studiu
 * - Trimiterea mesajelor în chat
 * - Validarea apartenenței la spațiu
 * - Notificările WebSocket
 */
@ExtendWith(MockitoExtension.class)
class ChatServiceTest {

    @Mock
    private ChatMessageRepository chatMessageRepository;

    @Mock
    private SpaceMembershipRepository membershipRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private WebSocketService webSocketService;

    @InjectMocks
    private ChatService chatService;

    private SpaceMembership testMembership;
    private User testUser;
    private ChatMessage testMessage;

    @BeforeEach
    void setUp() {
        testMembership = SpaceMembership.builder()
                .id("membership1")
                .spaceId("space123")
                .userId("user123")
                .build();

        testUser = User.builder()
                .id("user123")
                .email("test@student.com")
                .firstName("Andrei")
                .lastName("Popescu")
                .build();

        testMessage = ChatMessage.builder()
                .id("msg1")
                .spaceId("space123")
                .authorUserId("user123")
                .content("Salut! Ați rezolvat problema 3?")
                .createdAt(Instant.now())
                .build();
    }

    // ============================================
    // Teste pentru Get Messages
    // ============================================

    @Test
    void getMessages_Success_ShouldReturnMessages() {
        try (MockedStatic<SecurityUtils> securityUtils = mockStatic(SecurityUtils.class)) {
            // Arrange
            securityUtils.when(SecurityUtils::getCurrentUserId).thenReturn("user123");

            when(membershipRepository.findBySpaceIdAndUserId("space123", "user123"))
                    .thenReturn(Optional.of(testMembership));
            when(chatMessageRepository.findTop100BySpaceIdOrderByCreatedAtDesc("space123"))
                    .thenReturn(List.of(testMessage));
            when(userRepository.findById("user123")).thenReturn(Optional.of(testUser));

            // Act
            List<ChatMessageDTO> result = chatService.getMessages("space123");

            // Assert
            assertNotNull(result);
            assertEquals(1, result.size());
            assertEquals("Salut! Ați rezolvat problema 3?", result.get(0).getContent());
            assertEquals("Andrei Popescu", result.get(0).getAuthorName());
        }
    }

    @Test
    void getMessages_NotMember_ShouldThrowException() {
        try (MockedStatic<SecurityUtils> securityUtils = mockStatic(SecurityUtils.class)) {
            // Arrange
            securityUtils.when(SecurityUtils::getCurrentUserId).thenReturn("user456");
            when(membershipRepository.findBySpaceIdAndUserId("space123", "user456"))
                    .thenReturn(Optional.empty());

            // Act & Assert
            IllegalStateException exception = assertThrows(
                    IllegalStateException.class,
                    () -> chatService.getMessages("space123"));

            assertEquals("Not a member of this space", exception.getMessage());
        }
    }

    @Test
    void getMessages_EmptySpace_ShouldReturnEmptyList() {
        try (MockedStatic<SecurityUtils> securityUtils = mockStatic(SecurityUtils.class)) {
            // Arrange
            securityUtils.when(SecurityUtils::getCurrentUserId).thenReturn("user123");

            when(membershipRepository.findBySpaceIdAndUserId("space123", "user123"))
                    .thenReturn(Optional.of(testMembership));
            when(chatMessageRepository.findTop100BySpaceIdOrderByCreatedAtDesc("space123"))
                    .thenReturn(List.of());

            // Act
            List<ChatMessageDTO> result = chatService.getMessages("space123");

            // Assert
            assertNotNull(result);
            assertTrue(result.isEmpty());
        }
    }

    @Test
    void getMessages_MultipleMessages_ShouldReturnInChronologicalOrder() {
        try (MockedStatic<SecurityUtils> securityUtils = mockStatic(SecurityUtils.class)) {
            // Arrange
            securityUtils.when(SecurityUtils::getCurrentUserId).thenReturn("user123");

            Instant now = Instant.now();
            ChatMessage msg1 = ChatMessage.builder()
                    .id("msg1")
                    .spaceId("space123")
                    .authorUserId("user123")
                    .content("Mesaj vechi")
                    .createdAt(now.minusSeconds(60))
                    .build();
            ChatMessage msg2 = ChatMessage.builder()
                    .id("msg2")
                    .spaceId("space123")
                    .authorUserId("user123")
                    .content("Mesaj nou")
                    .createdAt(now)
                    .build();

            when(membershipRepository.findBySpaceIdAndUserId("space123", "user123"))
                    .thenReturn(Optional.of(testMembership));
            // Repository returns newest first, but service should reverse
            when(chatMessageRepository.findTop100BySpaceIdOrderByCreatedAtDesc("space123"))
                    .thenReturn(new java.util.ArrayList<>(List.of(msg2, msg1)));
            when(userRepository.findById("user123")).thenReturn(Optional.of(testUser));

            // Act
            List<ChatMessageDTO> result = chatService.getMessages("space123");

            // Assert
            assertEquals(2, result.size());
            // Should be in chronological order (oldest first)
            assertEquals("Mesaj vechi", result.get(0).getContent());
            assertEquals("Mesaj nou", result.get(1).getContent());
        }
    }

    // ============================================
    // Teste pentru Send Message
    // ============================================

    @Test
    void sendMessage_Success_ShouldSaveAndBroadcast() {
        try (MockedStatic<SecurityUtils> securityUtils = mockStatic(SecurityUtils.class)) {
            // Arrange
            securityUtils.when(SecurityUtils::getCurrentUserId).thenReturn("user123");

            when(membershipRepository.findBySpaceIdAndUserId("space123", "user123"))
                    .thenReturn(Optional.of(testMembership));
            when(chatMessageRepository.save(any(ChatMessage.class))).thenAnswer(invocation -> {
                ChatMessage msg = invocation.getArgument(0);
                msg.setId("newMsgId");
                return msg;
            });
            when(userRepository.findById("user123")).thenReturn(Optional.of(testUser));

            // Act
            ChatMessageDTO result = chatService.sendMessage("space123", "Test message content");

            // Assert
            assertNotNull(result);
            assertEquals("Test message content", result.getContent());
            assertEquals("space123", result.getSpaceId());
            assertEquals("Andrei Popescu", result.getAuthorName());

            verify(chatMessageRepository).save(any(ChatMessage.class));
            verify(webSocketService).sendChatMessage(any(WebSocketEvent.class));
        }
    }

    @Test
    void sendMessage_NotMember_ShouldThrowException() {
        try (MockedStatic<SecurityUtils> securityUtils = mockStatic(SecurityUtils.class)) {
            // Arrange
            securityUtils.when(SecurityUtils::getCurrentUserId).thenReturn("user456");
            when(membershipRepository.findBySpaceIdAndUserId("space123", "user456"))
                    .thenReturn(Optional.empty());

            // Act & Assert
            IllegalStateException exception = assertThrows(
                    IllegalStateException.class,
                    () -> chatService.sendMessage("space123", "Test message"));

            assertEquals("Not a member of this space", exception.getMessage());
            verify(chatMessageRepository, never()).save(any(ChatMessage.class));
            verify(webSocketService, never()).sendChatMessage(any(WebSocketEvent.class));
        }
    }

    @Test
    void sendMessage_ShouldSetCorrectTimestamp() {
        try (MockedStatic<SecurityUtils> securityUtils = mockStatic(SecurityUtils.class)) {
            // Arrange
            securityUtils.when(SecurityUtils::getCurrentUserId).thenReturn("user123");
            Instant beforeTest = Instant.now();

            when(membershipRepository.findBySpaceIdAndUserId("space123", "user123"))
                    .thenReturn(Optional.of(testMembership));
            when(chatMessageRepository.save(any(ChatMessage.class)))
                    .thenAnswer(invocation -> invocation.getArgument(0));
            when(userRepository.findById("user123")).thenReturn(Optional.of(testUser));

            // Act
            ChatMessageDTO result = chatService.sendMessage("space123", "Test");
            Instant afterTest = Instant.now();

            // Assert
            assertNotNull(result.getCreatedAt());
            assertTrue(result.getCreatedAt().isAfter(beforeTest) || result.getCreatedAt().equals(beforeTest));
            assertTrue(result.getCreatedAt().isBefore(afterTest) || result.getCreatedAt().equals(afterTest));
        }
    }

    @Test
    void sendMessage_UnknownAuthor_ShouldUseDefaultName() {
        try (MockedStatic<SecurityUtils> securityUtils = mockStatic(SecurityUtils.class)) {
            // Arrange
            securityUtils.when(SecurityUtils::getCurrentUserId).thenReturn("user123");

            when(membershipRepository.findBySpaceIdAndUserId("space123", "user123"))
                    .thenReturn(Optional.of(testMembership));
            when(chatMessageRepository.save(any(ChatMessage.class)))
                    .thenAnswer(invocation -> invocation.getArgument(0));
            when(userRepository.findById("user123")).thenReturn(Optional.empty());

            // Act
            ChatMessageDTO result = chatService.sendMessage("space123", "Test");

            // Assert
            assertEquals("Unknown", result.getAuthorName());
        }
    }
}
