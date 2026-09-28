package com.studysync.controller;

import com.studysync.dto.PassageDTO;
import com.studysync.dto.SearchRequestDTO;
import com.studysync.repository.SpaceMembershipRepository;
import com.studysync.security.SecurityUtils;
import com.studysync.service.RAGSearchService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/spaces/{spaceId}/search")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
@Tag(name = "Search", description = "AI-powered passage search")
public class PassageFinderController {

    private final RAGSearchService ragSearchService;
    private final SpaceMembershipRepository membershipRepository;

    @PostMapping
    @Operation(summary = "Search for relevant passages in space documents")
    public List<PassageDTO> search(
            @PathVariable String spaceId,
            @RequestBody SearchRequestDTO request) {

        requireMembership(spaceId);

        if (request.getDocumentIds() == null || request.getDocumentIds().isEmpty()) {
            System.out.println("No document IDs provided. Searching all documents in space.");
        }

        return ragSearchService.search(
                request.getQuery(),
                spaceId,
                request.getTopK(),
                request.getTopKImages(),
                request.getDocumentIds(),
                request.isIncludeImages(),
                request.isUseReranker());
    }

    private void requireMembership(String spaceId) {
        String userId = SecurityUtils.getCurrentUserId();
        if (membershipRepository.findBySpaceIdAndUserId(spaceId, userId).isEmpty()) {
            throw new IllegalStateException("Not a member of this space");
        }
    }
}
