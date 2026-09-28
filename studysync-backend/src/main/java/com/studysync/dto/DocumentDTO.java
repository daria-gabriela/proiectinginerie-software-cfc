package com.studysync.dto;

import lombok.Builder;
import lombok.Data;

import java.time.Instant;

@Data
@Builder
public class DocumentDTO {
    private String id;
    private String spaceId;
    private String originalFilename;
    private String contentType;
    private Long fileSize;
    private Integer totalPages;
    private boolean indexed;
    private Integer chunkCount;
    private Integer chunkTokens;  // Max tokens per chunk (100-1000)
    private String processingError;
    private Instant createdAt;
    private String uploadedByUserName;
}
