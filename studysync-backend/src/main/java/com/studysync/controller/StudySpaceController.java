package com.studysync.controller;

import com.studysync.dto.CreateSpaceDTO;
import com.studysync.dto.JoinSpaceDTO;
import com.studysync.dto.StudySpaceDTO;
import com.studysync.service.StudySpaceService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/spaces")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
@Tag(name = "Study Spaces", description = "Study space management")
public class StudySpaceController {

    private final StudySpaceService studySpaceService;

    @GetMapping
    @Operation(summary = "Get all spaces for current user")
    public List<StudySpaceDTO> getMySpaces() {
        return studySpaceService.getSpacesForCurrentUser();
    }

    @PostMapping
    @Operation(summary = "Create a new study space")
    public ResponseEntity<StudySpaceDTO> createSpace(@RequestBody CreateSpaceDTO dto) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(studySpaceService.createSpace(dto));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get space details with members")
    public StudySpaceDTO getSpace(@PathVariable String id) {
        return studySpaceService.getSpaceById(id);
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete a space (owner only)")
    public ResponseEntity<Void> deleteSpace(@PathVariable String id) {
        studySpaceService.deleteSpace(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/join")
    @Operation(summary = "Join a space using invite code")
    public StudySpaceDTO joinSpaceByCode(@RequestBody JoinSpaceDTO dto) {
        return studySpaceService.joinSpaceByInviteCode(dto.getInviteCode());
    }

    @PostMapping("/{id}/join")
    @Operation(summary = "Join a space using invite code (legacy)")
    public StudySpaceDTO joinSpace(@PathVariable String id, @RequestBody JoinSpaceDTO dto) {
        return studySpaceService.joinSpace(id, dto.getInviteCode());
    }

    @DeleteMapping("/{id}/members/{userId}")
    @Operation(summary = "Remove a member from space")
    public ResponseEntity<Void> removeMember(@PathVariable String id, @PathVariable String userId) {
        studySpaceService.removeMember(id, userId);
        return ResponseEntity.noContent().build();
    }
}
