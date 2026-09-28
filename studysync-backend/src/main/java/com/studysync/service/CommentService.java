package com.studysync.service;

import com.studysync.dto.CommentDTO;
import com.studysync.dto.CreateCommentDTO;
import com.studysync.dto.WebSocketEvent;
import com.studysync.model.Comment;
import com.studysync.model.StudyDocument;
import com.studysync.repository.CommentRepository;
import com.studysync.repository.DocumentRepository;
import com.studysync.repository.SpaceMembershipRepository;
import com.studysync.repository.UserRepository;
import com.studysync.security.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
public class CommentService {

    private final CommentRepository commentRepository;
    private final SpaceMembershipRepository membershipRepository;
    private final UserRepository userRepository;
    private final DocumentRepository documentRepository;
    private final WebSocketService webSocketService;

    private static final Pattern MENTION_PATTERN = Pattern.compile("@(\\w+)");

    public List<CommentDTO> getCommentsForSpace(String spaceId) {
        requireMembership(spaceId);
        return commentRepository.findBySpaceId(spaceId).stream()
                .map(this::toDTO)
                .toList();
    }

    public List<CommentDTO> getCommentsForDocument(String spaceId, String documentId) {
        requireMembership(spaceId);
        return commentRepository.findByDocumentId(documentId).stream()
                .map(this::toDTO)
                .toList();
    }

    public CommentDTO createComment(String spaceId, CreateCommentDTO dto) {
        requireMembership(spaceId);
        String userId = SecurityUtils.getCurrentUserId();

        List<String> mentions = extractMentions(dto.getContent());

        Comment comment = Comment.builder()
                .spaceId(spaceId)
                .documentId(dto.getDocumentId())
                .passageId(dto.getPassageId())
                .chunkId(dto.getChunkId())           // Primary anchor
                .pageNumber(dto.getPageNumber())
                .selectedText(dto.getSelectedText())
                .authorUserId(userId)
                .content(dto.getContent())
                .mentions(mentions)
                .createdAt(Instant.now())
                .build();

        comment = commentRepository.save(comment);
        CommentDTO commentDTO = toDTO(comment);
        
        // Send real-time notification via WebSocket
        sendCommentNotification(spaceId, commentDTO, dto.getDocumentId());
        
        return commentDTO;
    }
    
    /**
     * Send WebSocket notification when a comment is added
     */
    private void sendCommentNotification(String spaceId, CommentDTO commentDTO, String documentId) {
        // Get document filename for the notification
        String documentFilename = documentRepository.findById(documentId)
                .map(StudyDocument::getOriginalFilename)
                .orElse("Unknown document");
        
        // Build payload with all necessary info for the frontend
        Map<String, Object> payload = new HashMap<>();
        payload.put("commentId", commentDTO.getId());
        payload.put("authorName", commentDTO.getAuthorName());
        payload.put("authorUserId", commentDTO.getAuthorUserId());
        payload.put("documentId", documentId);
        payload.put("documentFilename", documentFilename);
        payload.put("text", commentDTO.getContent());
        payload.put("chunkId", commentDTO.getChunkId());
        payload.put("pageNumber", commentDTO.getPageNumber());
        
        WebSocketEvent event = WebSocketEvent.builder()
                .type(WebSocketEvent.EventType.COMMENT_ADDED)
                .spaceId(spaceId)
                .documentId(documentId)
                .userId(commentDTO.getAuthorUserId())
                .message(commentDTO.getAuthorName() + " commented on " + documentFilename)
                .payload(payload)
                .build();
        
        webSocketService.sendCommentEvent(event);
    }

    public CommentDTO updateComment(String commentId, String content) {
        Comment comment = commentRepository.findById(commentId).orElseThrow();
        requireOwnership(comment);

        List<String> mentions = extractMentions(content);
        comment.setContent(content);
        comment.setMentions(mentions);

        return toDTO(commentRepository.save(comment));
    }

    public void deleteComment(String commentId) {
        Comment comment = commentRepository.findById(commentId).orElseThrow();
        requireOwnership(comment);
        commentRepository.delete(comment);
    }

    /**
     * Delete all comments for a document (used when re-indexing changes chunk IDs).
     */
    public void deleteCommentsForDocument(String documentId) {
        commentRepository.deleteByDocumentId(documentId);
    }

    private List<String> extractMentions(String content) {
        List<String> mentions = new ArrayList<>();
        Matcher matcher = MENTION_PATTERN.matcher(content);
        while (matcher.find()) {
            mentions.add(matcher.group(1));
        }
        return mentions;
    }

    private void requireMembership(String spaceId) {
        String userId = SecurityUtils.getCurrentUserId();
        if (membershipRepository.findBySpaceIdAndUserId(spaceId, userId).isEmpty()) {
            throw new IllegalStateException("Not a member of this space");
        }
    }

    private void requireOwnership(Comment comment) {
        String userId = SecurityUtils.getCurrentUserId();
        if (!comment.getAuthorUserId().equals(userId)) {
            throw new IllegalStateException("Not the author of this comment");
        }
    }

    private CommentDTO toDTO(Comment comment) {
        String authorName = userRepository.findById(comment.getAuthorUserId())
                .map(u -> u.getFirstName() + " " + u.getLastName())
                .orElse("Unknown");

        return CommentDTO.builder()
                .id(comment.getId())
                .documentId(comment.getDocumentId())
                .passageId(comment.getPassageId())
                .chunkId(comment.getChunkId())       // Primary anchor
                .pageNumber(comment.getPageNumber())
                .selectedText(comment.getSelectedText())
                .authorUserId(comment.getAuthorUserId())
                .authorName(authorName)
                .content(comment.getContent())
                .mentions(comment.getMentions())
                .createdAt(comment.getCreatedAt())
                .build();
    }
}
