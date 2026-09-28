package com.studysync.service;

import com.studysync.dto.CommentDTO;
import com.studysync.dto.CreateCommentDTO;
import com.studysync.model.Comment;
import com.studysync.model.SpaceMembership;
import com.studysync.model.StudyDocument;
import com.studysync.model.User;
import com.studysync.repository.CommentRepository;
import com.studysync.repository.DocumentRepository;
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
import static org.mockito.Mockito.*;

/**
 * Teste unitare pentru CommentService
 * 
 * Aceste teste verifică:
 * - Crearea comentariilor pe documente și pasaje
 * - Extragerea mențiunilor (@username)
 * - Validarea permisiunilor de editare/ștergere
 * - Notificările WebSocket pentru comentarii noi
 */
@ExtendWith(MockitoExtension.class)
class CommentServiceTest {

    @Mock
    private CommentRepository commentRepository;
    
    @Mock
    private SpaceMembershipRepository membershipRepository;
    
    @Mock
    private UserRepository userRepository;
    
    @Mock
    private DocumentRepository documentRepository;
    
    @Mock
    private WebSocketService webSocketService;

    @InjectMocks
    private CommentService commentService;

    private SpaceMembership testMembership;
    private User testUser;
    private Comment testComment;
    private StudyDocument testDocument;

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

        testComment = Comment.builder()
                .id("comment1")
                .spaceId("space123")
                .documentId("doc1")
                .chunkId("chunk1")
                .pageNumber(5)
                .authorUserId("user123")
                .content("Acest pasaj este important pentru examen!")
                .mentions(List.of())
                .createdAt(Instant.now())
                .build();

        testDocument = StudyDocument.builder()
                .id("doc1")
                .originalFilename("Curs_Algoritmi.pdf")
                .spaceId("space123")
                .build();
    }

    // ============================================
    // Teste pentru Get Comments
    // ============================================

    @Test
    void getCommentsForSpace_Success_ShouldReturnComments() {
        try (MockedStatic<SecurityUtils> securityUtils = mockStatic(SecurityUtils.class)) {
            // Arrange
            securityUtils.when(SecurityUtils::getCurrentUserId).thenReturn("user123");
            
            when(membershipRepository.findBySpaceIdAndUserId("space123", "user123"))
                    .thenReturn(Optional.of(testMembership));
            when(commentRepository.findBySpaceId("space123")).thenReturn(List.of(testComment));
            when(userRepository.findById("user123")).thenReturn(Optional.of(testUser));

            // Act
            List<CommentDTO> result = commentService.getCommentsForSpace("space123");

            // Assert
            assertNotNull(result);
            assertEquals(1, result.size());
            assertEquals("Acest pasaj este important pentru examen!", result.get(0).getContent());
        }
    }

    @Test
    void getCommentsForSpace_NotMember_ShouldThrowException() {
        try (MockedStatic<SecurityUtils> securityUtils = mockStatic(SecurityUtils.class)) {
            // Arrange
            securityUtils.when(SecurityUtils::getCurrentUserId).thenReturn("user456");
            when(membershipRepository.findBySpaceIdAndUserId("space123", "user456"))
                    .thenReturn(Optional.empty());

            // Act & Assert
            IllegalStateException exception = assertThrows(
                    IllegalStateException.class,
                    () -> commentService.getCommentsForSpace("space123")
            );

            assertEquals("Not a member of this space", exception.getMessage());
        }
    }

    @Test
    void getCommentsForDocument_Success_ShouldReturnDocumentComments() {
        try (MockedStatic<SecurityUtils> securityUtils = mockStatic(SecurityUtils.class)) {
            // Arrange
            securityUtils.when(SecurityUtils::getCurrentUserId).thenReturn("user123");
            
            when(membershipRepository.findBySpaceIdAndUserId("space123", "user123"))
                    .thenReturn(Optional.of(testMembership));
            when(commentRepository.findByDocumentId("doc1")).thenReturn(List.of(testComment));
            when(userRepository.findById("user123")).thenReturn(Optional.of(testUser));

            // Act
            List<CommentDTO> result = commentService.getCommentsForDocument("space123", "doc1");

            // Assert
            assertNotNull(result);
            assertEquals(1, result.size());
            assertEquals("doc1", result.get(0).getDocumentId());
        }
    }

    // ============================================
    // Teste pentru Create Comment
    // ============================================

    @Test
    void createComment_Success_ShouldSaveAndNotify() {
        try (MockedStatic<SecurityUtils> securityUtils = mockStatic(SecurityUtils.class)) {
            // Arrange
            securityUtils.when(SecurityUtils::getCurrentUserId).thenReturn("user123");
            
            CreateCommentDTO createDTO = new CreateCommentDTO();
            createDTO.setDocumentId("doc1");
            createDTO.setChunkId("chunk1");
            createDTO.setPageNumber(5);
            createDTO.setContent("Comentariu nou");
            createDTO.setSelectedText("text selectat");

            when(membershipRepository.findBySpaceIdAndUserId("space123", "user123"))
                    .thenReturn(Optional.of(testMembership));
            when(commentRepository.save(any(Comment.class))).thenAnswer(invocation -> {
                Comment c = invocation.getArgument(0);
                c.setId("newCommentId");
                return c;
            });
            when(userRepository.findById("user123")).thenReturn(Optional.of(testUser));
            when(documentRepository.findById("doc1")).thenReturn(Optional.of(testDocument));

            // Act
            CommentDTO result = commentService.createComment("space123", createDTO);

            // Assert
            assertNotNull(result);
            assertEquals("Comentariu nou", result.getContent());
            assertEquals("chunk1", result.getChunkId());
            assertEquals(5, result.getPageNumber());
            
            verify(commentRepository).save(any(Comment.class));
            verify(webSocketService).sendCommentEvent(any());
        }
    }

    @Test
    void createComment_WithMentions_ShouldExtractMentions() {
        try (MockedStatic<SecurityUtils> securityUtils = mockStatic(SecurityUtils.class)) {
            // Arrange
            securityUtils.when(SecurityUtils::getCurrentUserId).thenReturn("user123");
            
            CreateCommentDTO createDTO = new CreateCommentDTO();
            createDTO.setDocumentId("doc1");
            createDTO.setContent("@Maria @Ion uitați-vă la această definiție!");

            when(membershipRepository.findBySpaceIdAndUserId("space123", "user123"))
                    .thenReturn(Optional.of(testMembership));
            when(commentRepository.save(any(Comment.class))).thenAnswer(invocation -> invocation.getArgument(0));
            when(userRepository.findById("user123")).thenReturn(Optional.of(testUser));
            when(documentRepository.findById("doc1")).thenReturn(Optional.of(testDocument));

            // Act
            commentService.createComment("space123", createDTO);

            // Assert
            verify(commentRepository).save(argThat(comment ->
                comment.getMentions().contains("Maria") &&
                comment.getMentions().contains("Ion") &&
                comment.getMentions().size() == 2
            ));
        }
    }

    @Test
    void createComment_NotMember_ShouldThrowException() {
        try (MockedStatic<SecurityUtils> securityUtils = mockStatic(SecurityUtils.class)) {
            // Arrange
            securityUtils.when(SecurityUtils::getCurrentUserId).thenReturn("user456");
            when(membershipRepository.findBySpaceIdAndUserId("space123", "user456"))
                    .thenReturn(Optional.empty());

            CreateCommentDTO createDTO = new CreateCommentDTO();
            createDTO.setDocumentId("doc1");
            createDTO.setContent("Test");

            // Act & Assert
            IllegalStateException exception = assertThrows(
                    IllegalStateException.class,
                    () -> commentService.createComment("space123", createDTO)
            );

            assertEquals("Not a member of this space", exception.getMessage());
        }
    }

    // ============================================
    // Teste pentru Update Comment
    // ============================================

    @Test
    void updateComment_AsAuthor_ShouldUpdateSuccessfully() {
        try (MockedStatic<SecurityUtils> securityUtils = mockStatic(SecurityUtils.class)) {
            // Arrange
            securityUtils.when(SecurityUtils::getCurrentUserId).thenReturn("user123");
            
            when(commentRepository.findById("comment1")).thenReturn(Optional.of(testComment));
            when(commentRepository.save(any(Comment.class))).thenAnswer(invocation -> invocation.getArgument(0));
            when(userRepository.findById("user123")).thenReturn(Optional.of(testUser));

            // Act
            CommentDTO result = commentService.updateComment("comment1", "Conținut actualizat");

            // Assert
            assertEquals("Conținut actualizat", result.getContent());
            verify(commentRepository).save(argThat(comment ->
                comment.getContent().equals("Conținut actualizat")
            ));
        }
    }

    @Test
    void updateComment_NotAuthor_ShouldThrowException() {
        try (MockedStatic<SecurityUtils> securityUtils = mockStatic(SecurityUtils.class)) {
            // Arrange
            securityUtils.when(SecurityUtils::getCurrentUserId).thenReturn("user456"); // Different user
            when(commentRepository.findById("comment1")).thenReturn(Optional.of(testComment));

            // Act & Assert
            assertThrows(
                    IllegalStateException.class,
                    () -> commentService.updateComment("comment1", "New content")
            );
            verify(commentRepository, never()).save(any(Comment.class));
        }
    }

    @Test
    void updateComment_WithNewMentions_ShouldUpdateMentions() {
        try (MockedStatic<SecurityUtils> securityUtils = mockStatic(SecurityUtils.class)) {
            // Arrange
            securityUtils.when(SecurityUtils::getCurrentUserId).thenReturn("user123");
            
            when(commentRepository.findById("comment1")).thenReturn(Optional.of(testComment));
            when(commentRepository.save(any(Comment.class))).thenAnswer(invocation -> invocation.getArgument(0));
            when(userRepository.findById("user123")).thenReturn(Optional.of(testUser));

            // Act
            commentService.updateComment("comment1", "@NewUser vezi aici!");

            // Assert
            verify(commentRepository).save(argThat(comment ->
                comment.getMentions().contains("NewUser")
            ));
        }
    }

    // ============================================
    // Teste pentru Delete Comment
    // ============================================

    @Test
    void deleteComment_AsAuthor_ShouldDeleteSuccessfully() {
        try (MockedStatic<SecurityUtils> securityUtils = mockStatic(SecurityUtils.class)) {
            // Arrange
            securityUtils.when(SecurityUtils::getCurrentUserId).thenReturn("user123");
            when(commentRepository.findById("comment1")).thenReturn(Optional.of(testComment));

            // Act
            commentService.deleteComment("comment1");

            // Assert
            verify(commentRepository).delete(testComment);
        }
    }

    @Test
    void deleteComment_NotAuthor_ShouldThrowException() {
        try (MockedStatic<SecurityUtils> securityUtils = mockStatic(SecurityUtils.class)) {
            // Arrange
            securityUtils.when(SecurityUtils::getCurrentUserId).thenReturn("user456");
            when(commentRepository.findById("comment1")).thenReturn(Optional.of(testComment));

            // Act & Assert
            assertThrows(
                    IllegalStateException.class,
                    () -> commentService.deleteComment("comment1")
            );
            verify(commentRepository, never()).delete(any(Comment.class));
        }
    }

    // ============================================
    // Teste pentru Delete Comments For Document
    // ============================================

    @Test
    void deleteCommentsForDocument_ShouldDeleteAll() {
        // Act
        commentService.deleteCommentsForDocument("doc1");

        // Assert
        verify(commentRepository).deleteByDocumentId("doc1");
    }
}
