package com.studysync.dto;

import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.util.List;

@Data
@Builder
public class CommentDTO {
    private String id;
    private String documentId;
    private String passageId;
    
    // Chunk-centric fields (new architecture)
    private String chunkId;       // Unique chunk identifier
    private Integer pageNumber;
    private String selectedText;  // Chunk text content
    
    // Legacy field (kept for backward compatibility)
    private Integer elementIndex;
    
    private String authorUserId;
    private String authorName;
    private String content;
    private List<String> mentions;
    private Instant createdAt;
}
