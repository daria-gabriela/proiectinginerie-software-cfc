package com.studysync.controller;

import com.studysync.dto.CommentDTO;
import com.studysync.dto.CreateCommentDTO;
import com.studysync.service.CommentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
@Tag(name = "Comments", description = "Comment collaboration on documents")
public class CommentController {

    private final CommentService commentService;

    @GetMapping("/api/spaces/{spaceId}/comments")
    @Operation(summary = "Get all comments in a space")
    public List<CommentDTO> getSpaceComments(@PathVariable String spaceId) {
        return commentService.getCommentsForSpace(spaceId);
    }

    @GetMapping("/api/spaces/{spaceId}/documents/{documentId}/comments")
    @Operation(summary = "Get all comments on a document")
    public List<CommentDTO> getDocumentComments(
            @PathVariable String spaceId,
            @PathVariable String documentId) {
        return commentService.getCommentsForDocument(spaceId, documentId);
    }

    @PostMapping("/api/spaces/{spaceId}/comments")
    @Operation(summary = "Create a comment in a space")
    public ResponseEntity<CommentDTO> createComment(
            @PathVariable String spaceId,
            @RequestBody CreateCommentDTO dto) {
        CommentDTO comment = commentService.createComment(spaceId, dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(comment);
    }

    @PutMapping("/api/comments/{commentId}")
    @Operation(summary = "Update a comment")
    public CommentDTO updateComment(
            @PathVariable String commentId,
            @RequestBody Map<String, String> body) {
        return commentService.updateComment(commentId, body.get("content"));
    }

    @DeleteMapping("/api/comments/{commentId}")
    @Operation(summary = "Delete a comment")
    public ResponseEntity<Void> deleteComment(@PathVariable String commentId) {
        commentService.deleteComment(commentId);
        return ResponseEntity.noContent().build();
    }
}
