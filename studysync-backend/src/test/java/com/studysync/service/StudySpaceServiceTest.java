package com.studysync.service;

import com.studysync.dto.CreateSpaceDTO;
import com.studysync.dto.StudySpaceDTO;
import com.studysync.model.MemberRole;
import com.studysync.model.SpaceMembership;
import com.studysync.model.StudySpace;
import com.studysync.model.User;
import com.studysync.repository.SpaceMembershipRepository;
import com.studysync.repository.StudySpaceRepository;
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
 * Teste unitare pentru StudySpaceService
 * 
 * Aceste teste verifică:
 * - Crearea spațiilor de studiu
 * - Listarea spațiilor pentru un utilizator
 * - Alăturarea la un spațiu prin cod de invitație
 * - Ștergerea spațiilor și validarea permisiunilor
 * - Eliminarea membrilor din spații
 */
@ExtendWith(MockitoExtension.class)
class StudySpaceServiceTest {

    @Mock
    private StudySpaceRepository spaceRepository;
    
    @Mock
    private SpaceMembershipRepository membershipRepository;
    
    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private StudySpaceService studySpaceService;

    private StudySpace testSpace;
    private SpaceMembership ownerMembership;
    private SpaceMembership memberMembership;
    private User testUser;
    private User memberUser;

    @BeforeEach
    void setUp() {
        testSpace = StudySpace.builder()
                .id("space123")
                .name("Algoritmi și Structuri de Date")
                .description("Spațiu de studiu pentru cursul ASD")
                .ownerUserId("user123")
                .inviteCode("ABC12345")
                .createdAt(Instant.now())
                .build();

        ownerMembership = SpaceMembership.builder()
                .id("membership1")
                .spaceId("space123")
                .userId("user123")
                .role(MemberRole.OWNER)
                .joinedAt(Instant.now())
                .build();

        memberMembership = SpaceMembership.builder()
                .id("membership2")
                .spaceId("space123")
                .userId("user456")
                .role(MemberRole.MEMBER)
                .joinedAt(Instant.now())
                .build();

        testUser = User.builder()
                .id("user123")
                .email("owner@student.com")
                .firstName("Andrei")
                .lastName("Popescu")
                .build();

        memberUser = User.builder()
                .id("user456")
                .email("member@student.com")
                .firstName("Maria")
                .lastName("Ionescu")
                .build();
    }

    // ============================================
    // Teste pentru Create Space
    // ============================================

    @Test
    void createSpace_Success_ShouldReturnSpaceDTO() {
        try (MockedStatic<SecurityUtils> securityUtils = mockStatic(SecurityUtils.class)) {
            // Arrange
            securityUtils.when(SecurityUtils::getCurrentUserId).thenReturn("user123");
            
            CreateSpaceDTO createDTO = new CreateSpaceDTO();
            createDTO.setName("Nou Spațiu de Studiu");
            createDTO.setDescription("Descriere test");

            when(spaceRepository.save(any(StudySpace.class))).thenAnswer(invocation -> {
                StudySpace space = invocation.getArgument(0);
                space.setId("newSpaceId");
                return space;
            });
            when(membershipRepository.save(any(SpaceMembership.class))).thenAnswer(invocation -> invocation.getArgument(0));

            // Act
            StudySpaceDTO result = studySpaceService.createSpace(createDTO);

            // Assert
            assertNotNull(result);
            assertEquals("Nou Spațiu de Studiu", result.getName());
            assertEquals("Descriere test", result.getDescription());
            assertNotNull(result.getInviteCode());
            assertEquals("user123", result.getOwnerUserId());
            
            verify(spaceRepository).save(any(StudySpace.class));
            verify(membershipRepository).save(argThat(membership -> 
                membership.getRole() == MemberRole.OWNER &&
                membership.getUserId().equals("user123")
            ));
        }
    }

    @Test
    void createSpace_ShouldGenerateUniqueInviteCode() {
        try (MockedStatic<SecurityUtils> securityUtils = mockStatic(SecurityUtils.class)) {
            // Arrange
            securityUtils.when(SecurityUtils::getCurrentUserId).thenReturn("user123");
            
            CreateSpaceDTO createDTO = new CreateSpaceDTO();
            createDTO.setName("Test Space");

            when(spaceRepository.save(any(StudySpace.class))).thenAnswer(invocation -> invocation.getArgument(0));
            when(membershipRepository.save(any(SpaceMembership.class))).thenAnswer(invocation -> invocation.getArgument(0));

            // Act
            StudySpaceDTO result = studySpaceService.createSpace(createDTO);

            // Assert
            assertNotNull(result.getInviteCode());
            assertEquals(8, result.getInviteCode().length());
        }
    }

    // ============================================
    // Teste pentru Get Spaces
    // ============================================

    @Test
    void getSpacesForCurrentUser_Success_ShouldReturnUserSpaces() {
        try (MockedStatic<SecurityUtils> securityUtils = mockStatic(SecurityUtils.class)) {
            // Arrange
            securityUtils.when(SecurityUtils::getCurrentUserId).thenReturn("user123");
            
            when(membershipRepository.findByUserId("user123")).thenReturn(List.of(ownerMembership));
            when(spaceRepository.findById("space123")).thenReturn(Optional.of(testSpace));

            // Act
            List<StudySpaceDTO> result = studySpaceService.getSpacesForCurrentUser();

            // Assert
            assertNotNull(result);
            assertEquals(1, result.size());
            assertEquals("Algoritmi și Structuri de Date", result.get(0).getName());
        }
    }

    @Test
    void getSpacesForCurrentUser_NoSpaces_ShouldReturnEmptyList() {
        try (MockedStatic<SecurityUtils> securityUtils = mockStatic(SecurityUtils.class)) {
            // Arrange
            securityUtils.when(SecurityUtils::getCurrentUserId).thenReturn("user123");
            when(membershipRepository.findByUserId("user123")).thenReturn(List.of());

            // Act
            List<StudySpaceDTO> result = studySpaceService.getSpacesForCurrentUser();

            // Assert
            assertNotNull(result);
            assertTrue(result.isEmpty());
        }
    }

    // ============================================
    // Teste pentru Join Space
    // ============================================

    @Test
    void joinSpaceByInviteCode_Success_ShouldAddMember() {
        try (MockedStatic<SecurityUtils> securityUtils = mockStatic(SecurityUtils.class)) {
            // Arrange
            securityUtils.when(SecurityUtils::getCurrentUserId).thenReturn("user456");
            
            when(spaceRepository.findByInviteCode("ABC12345")).thenReturn(Optional.of(testSpace));
            when(membershipRepository.findBySpaceIdAndUserId("space123", "user456")).thenReturn(Optional.empty());
            when(membershipRepository.save(any(SpaceMembership.class))).thenAnswer(invocation -> invocation.getArgument(0));

            // Act
            StudySpaceDTO result = studySpaceService.joinSpaceByInviteCode("ABC12345");

            // Assert
            assertNotNull(result);
            assertEquals("space123", result.getId());
            verify(membershipRepository).save(argThat(membership ->
                membership.getRole() == MemberRole.MEMBER &&
                membership.getUserId().equals("user456")
            ));
        }
    }

    @Test
    void joinSpaceByInviteCode_InvalidCode_ShouldThrowException() {
        try (MockedStatic<SecurityUtils> securityUtils = mockStatic(SecurityUtils.class)) {
            // Arrange
            securityUtils.when(SecurityUtils::getCurrentUserId).thenReturn("user456");
            when(spaceRepository.findByInviteCode("INVALID")).thenReturn(Optional.empty());

            // Act & Assert
            IllegalArgumentException exception = assertThrows(
                    IllegalArgumentException.class,
                    () -> studySpaceService.joinSpaceByInviteCode("INVALID")
            );

            assertEquals("Invalid invite code", exception.getMessage());
        }
    }

    @Test
    void joinSpaceByInviteCode_AlreadyMember_ShouldThrowException() {
        try (MockedStatic<SecurityUtils> securityUtils = mockStatic(SecurityUtils.class)) {
            // Arrange
            securityUtils.when(SecurityUtils::getCurrentUserId).thenReturn("user123");
            
            when(spaceRepository.findByInviteCode("ABC12345")).thenReturn(Optional.of(testSpace));
            when(membershipRepository.findBySpaceIdAndUserId("space123", "user123"))
                    .thenReturn(Optional.of(ownerMembership));

            // Act & Assert
            IllegalStateException exception = assertThrows(
                    IllegalStateException.class,
                    () -> studySpaceService.joinSpaceByInviteCode("ABC12345")
            );

            assertEquals("Already a member", exception.getMessage());
        }
    }

    // ============================================
    // Teste pentru Delete Space
    // ============================================

    @Test
    void deleteSpace_AsOwner_ShouldDeleteSuccessfully() {
        try (MockedStatic<SecurityUtils> securityUtils = mockStatic(SecurityUtils.class)) {
            // Arrange
            securityUtils.when(SecurityUtils::getCurrentUserId).thenReturn("user123");
            when(spaceRepository.findById("space123")).thenReturn(Optional.of(testSpace));

            // Act
            studySpaceService.deleteSpace("space123");

            // Assert
            verify(membershipRepository).deleteBySpaceId("space123");
            verify(spaceRepository).deleteById("space123");
        }
    }

    @Test
    void deleteSpace_NotOwner_ShouldThrowException() {
        try (MockedStatic<SecurityUtils> securityUtils = mockStatic(SecurityUtils.class)) {
            // Arrange
            securityUtils.when(SecurityUtils::getCurrentUserId).thenReturn("user456");
            when(spaceRepository.findById("space123")).thenReturn(Optional.of(testSpace));

            // Act & Assert
            IllegalStateException exception = assertThrows(
                    IllegalStateException.class,
                    () -> studySpaceService.deleteSpace("space123")
            );

            assertEquals("Only owner can delete space", exception.getMessage());
            verify(spaceRepository, never()).deleteById(anyString());
        }
    }

    // ============================================
    // Teste pentru Remove Member
    // ============================================

    @Test
    void removeMember_AsOwner_ShouldRemoveSuccessfully() {
        try (MockedStatic<SecurityUtils> securityUtils = mockStatic(SecurityUtils.class)) {
            // Arrange
            securityUtils.when(SecurityUtils::getCurrentUserId).thenReturn("user123");
            
            when(spaceRepository.findById("space123")).thenReturn(Optional.of(testSpace));
            when(membershipRepository.findBySpaceIdAndUserId("space123", "user456"))
                    .thenReturn(Optional.of(memberMembership));

            // Act
            studySpaceService.removeMember("space123", "user456");

            // Assert
            verify(membershipRepository).delete(memberMembership);
        }
    }

    @Test
    void removeMember_CannotRemoveOwner_ShouldThrowException() {
        try (MockedStatic<SecurityUtils> securityUtils = mockStatic(SecurityUtils.class)) {
            // Arrange
            securityUtils.when(SecurityUtils::getCurrentUserId).thenReturn("user123");
            when(spaceRepository.findById("space123")).thenReturn(Optional.of(testSpace));

            // Act & Assert
            IllegalStateException exception = assertThrows(
                    IllegalStateException.class,
                    () -> studySpaceService.removeMember("space123", "user123")
            );

            assertEquals("Cannot remove space owner", exception.getMessage());
        }
    }

    @Test
    void removeMember_NotAuthorized_ShouldThrowException() {
        try (MockedStatic<SecurityUtils> securityUtils = mockStatic(SecurityUtils.class)) {
            // Arrange
            securityUtils.when(SecurityUtils::getCurrentUserId).thenReturn("user789"); // Not owner, not self
            when(spaceRepository.findById("space123")).thenReturn(Optional.of(testSpace));

            // Act & Assert
            IllegalStateException exception = assertThrows(
                    IllegalStateException.class,
                    () -> studySpaceService.removeMember("space123", "user456")
            );

            assertEquals("Not authorized to remove member", exception.getMessage());
        }
    }

    @Test
    void removeMember_SelfRemoval_ShouldSucceed() {
        try (MockedStatic<SecurityUtils> securityUtils = mockStatic(SecurityUtils.class)) {
            // Arrange - user removes themselves
            securityUtils.when(SecurityUtils::getCurrentUserId).thenReturn("user456");
            
            when(spaceRepository.findById("space123")).thenReturn(Optional.of(testSpace));
            when(membershipRepository.findBySpaceIdAndUserId("space123", "user456"))
                    .thenReturn(Optional.of(memberMembership));

            // Act
            studySpaceService.removeMember("space123", "user456");

            // Assert
            verify(membershipRepository).delete(memberMembership);
        }
    }
}
