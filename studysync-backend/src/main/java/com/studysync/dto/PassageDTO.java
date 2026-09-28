package com.studysync.dto;

import lombok.Builder;
import lombok.Data;

import java.util.Map;

/**
 * Data Transfer Object for search results (passages/chunks).
 * 
 * Supports both text-only and multimodal (image) content types
 * for the vision-enabled search feature.
 */
@Data
@Builder
public class PassageDTO {
    // Core identification
    private String chunkId; // Unique chunk identifier
    private String documentId;
    private String documentFilename; // Original filename for source attribution
    private int page;
    private double score;

    // Content type: "text", "image", or "mixed"
    @Builder.Default
    private String contentType = "text";

    // Text content (for text and mixed chunks)
    private String text;

    // Image content (for image and mixed chunks)
    private String imagePath; // Relative path to image file
    private String imageUrl; // Full URL to serve image
    private String thumbnail; // Base64 encoded thumbnail for preview
    private Integer imageWidth;
    private Integer imageHeight;

    // Visual bounds for Study Mode highlighting
    private Map<String, Object> bounds; // {x, y, width, height}

    /**
     * Check if this passage contains an image.
     */
    public boolean hasImage() {
        return "image".equals(contentType) || "mixed".equals(contentType);
    }

    /**
     * Check if this passage contains text.
     */
    public boolean hasText() {
        return "text".equals(contentType) || "mixed".equals(contentType);
    }
}
