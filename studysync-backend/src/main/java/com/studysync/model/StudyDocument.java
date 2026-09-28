package com.studysync.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "documents")
public class StudyDocument {
    @Id
    private String id;

    private String spaceId;
    private String uploadedByUserId;
    private String originalFilename;
    private String contentType;
    private String storagePath;
    private Long fileSize;
    private Integer totalPages;

    @Builder.Default
    private boolean indexed = false;

    private Integer chunkCount;       // Number of chunks after ML processing
    private String processingError;   // Error message if indexing failed
    
    @Builder.Default
    private Integer chunkTokens = 400; // Max tokens per chunk (100-1000)

    private Instant createdAt;
}

