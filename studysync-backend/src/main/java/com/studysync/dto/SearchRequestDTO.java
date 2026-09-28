package com.studysync.dto;

import lombok.Data;

import java.util.List;

@Data
public class SearchRequestDTO {
    private String query;
    private int topK = 10;
    private int topKImages = 5;
    private List<String> documentIds;
    private boolean includeImages = true; // Include image chunks in search (multimodal)
    private boolean useReranker = true; // Use cross-encoder reranking for better accuracy
}
