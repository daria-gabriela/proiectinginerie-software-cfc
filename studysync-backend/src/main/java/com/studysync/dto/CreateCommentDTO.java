package com.studysync.dto;

import lombok.Data;

@Data
public class CreateCommentDTO {
    private String documentId;
    private String passageId;
    private String content;
    
    // Chunk-centric anchor (new architecture)
    private String chunkId;       // Primary field for anchoring comments
    private Integer pageNumber;
    private String selectedText;  // Chunk text content
    
    // Legacy field (kept for backward compatibility)
    private Integer elementIndex;
}
