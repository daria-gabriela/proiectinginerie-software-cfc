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
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class StudySpaceService {

    private final StudySpaceRepository spaceRepository;
    private final SpaceMembershipRepository membershipRepository;
    private final UserRepository userRepository;

    public List<StudySpaceDTO> getSpacesForCurrentUser() {
        String userId = SecurityUtils.getCurrentUserId();
        return membershipRepository.findByUserId(userId).stream()
                .map(m -> spaceRepository.findById(m.getSpaceId()).orElseThrow())
                .map(this::toDTO)
                .toList();
    }

    public StudySpaceDTO createSpace(CreateSpaceDTO dto) {
        String userId = SecurityUtils.getCurrentUserId();

        StudySpace space = StudySpace.builder()
                .name(dto.getName())
                .description(dto.getDescription())
                .ownerUserId(userId)
                .inviteCode(generateInviteCode())
                .createdAt(Instant.now())
                .build();
        space = spaceRepository.save(space);

        membershipRepository.save(SpaceMembership.builder()
                .spaceId(space.getId())
                .userId(userId)
                .role(MemberRole.OWNER)
                .joinedAt(Instant.now())
                .build());

        return toDTO(space);
    }

    public StudySpaceDTO getSpaceById(String spaceId) {
        requireMembership(spaceId);
        StudySpace space = spaceRepository.findById(spaceId).orElseThrow();
        return toDTOWithMembers(space);
    }

    public void deleteSpace(String spaceId) {
        StudySpace space = spaceRepository.findById(spaceId).orElseThrow();
        String userId = SecurityUtils.getCurrentUserId();
        if (!space.getOwnerUserId().equals(userId)) {
            throw new IllegalStateException("Only owner can delete space");
        }
        membershipRepository.deleteBySpaceId(spaceId);
        spaceRepository.deleteById(spaceId);
    }

    public StudySpaceDTO joinSpaceByInviteCode(String inviteCode) {
        StudySpace space = spaceRepository.findByInviteCode(inviteCode)
                .orElseThrow(() -> new IllegalArgumentException("Invalid invite code"));

        String userId = SecurityUtils.getCurrentUserId();
        if (membershipRepository.findBySpaceIdAndUserId(space.getId(), userId).isPresent()) {
            throw new IllegalStateException("Already a member");
        }

        membershipRepository.save(SpaceMembership.builder()
                .spaceId(space.getId())
                .userId(userId)
                .role(MemberRole.MEMBER)
                .joinedAt(Instant.now())
                .build());

        return toDTO(space);
    }

    public StudySpaceDTO joinSpace(String spaceId, String inviteCode) {
        StudySpace space = spaceRepository.findById(spaceId).orElseThrow();
        if (!space.getInviteCode().equals(inviteCode)) {
            throw new IllegalArgumentException("Invalid invite code");
        }

        String userId = SecurityUtils.getCurrentUserId();
        if (membershipRepository.findBySpaceIdAndUserId(spaceId, userId).isPresent()) {
            throw new IllegalStateException("Already a member");
        }

        membershipRepository.save(SpaceMembership.builder()
                .spaceId(spaceId)
                .userId(userId)
                .role(MemberRole.MEMBER)
                .joinedAt(Instant.now())
                .build());

        return toDTO(space);
    }

    public void removeMember(String spaceId, String targetUserId) {
        StudySpace space = spaceRepository.findById(spaceId).orElseThrow();
        String currentUserId = SecurityUtils.getCurrentUserId();

        // Only owner can remove others, or user can remove themselves
        if (!space.getOwnerUserId().equals(currentUserId) && !currentUserId.equals(targetUserId)) {
            throw new IllegalStateException("Not authorized to remove member");
        }

        // Owner cannot be removed
        if (space.getOwnerUserId().equals(targetUserId)) {
            throw new IllegalStateException("Cannot remove space owner");
        }

        SpaceMembership membership = membershipRepository.findBySpaceIdAndUserId(spaceId, targetUserId).orElseThrow();
        membershipRepository.delete(membership);
    }

    private void requireMembership(String spaceId) {
        String userId = SecurityUtils.getCurrentUserId();
        if (membershipRepository.findBySpaceIdAndUserId(spaceId, userId).isEmpty()) {
            throw new IllegalStateException("Not a member of this space");
        }
    }

    private StudySpaceDTO toDTO(StudySpace space) {
        return StudySpaceDTO.builder()
                .id(space.getId())
                .name(space.getName())
                .description(space.getDescription())
                .inviteCode(space.getInviteCode())
                .ownerUserId(space.getOwnerUserId())
                .build();
    }

    private StudySpaceDTO toDTOWithMembers(StudySpace space) {
        List<StudySpaceDTO.MemberDTO> members = membershipRepository.findBySpaceId(space.getId()).stream()
                .map(m -> {
                    User user = userRepository.findById(m.getUserId()).orElseThrow();
                    return StudySpaceDTO.MemberDTO.builder()
                            .userId(user.getId())
                            .firstName(user.getFirstName())
                            .lastName(user.getLastName())
                            .email(user.getEmail())
                            .role(m.getRole().name())
                            .build();
                })
                .toList();

        return StudySpaceDTO.builder()
                .id(space.getId())
                .name(space.getName())
                .description(space.getDescription())
                .inviteCode(space.getInviteCode())
                .ownerUserId(space.getOwnerUserId())
                .members(members)
                .build();
    }

    private String generateInviteCode() {
        return UUID.randomUUID().toString().substring(0, 8).toUpperCase();
    }
}
