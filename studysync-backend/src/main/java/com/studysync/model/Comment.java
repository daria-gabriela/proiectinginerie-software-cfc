package com.studysync.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "comments")
public class Comment {
    @Id
    private String id;

    private String spaceId;
    private String documentId;  // nullable
    private String passageId;   // nullable, for generic RAG passage comments
    
    // Chunk-centric fields (new architecture)
    private String chunkId;      // Primary anchor for comments - the unified unit
    private Integer pageNumber;  // Page containing the chunk
    private String selectedText; // Text content of the chunk
    
    // Legacy field - deprecated, use chunkId instead
    // Legacy field (kept for backward compatibility)
    private Integer elementIndex;
    
    private String authorUserId;
    private String content;
    private List<String> mentions;
    private Instant createdAt;
}
