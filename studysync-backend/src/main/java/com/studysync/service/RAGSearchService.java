package com.studysync.service;

import com.studysync.dto.PassageDTO;
import com.studysync.model.StudyDocument;
import com.studysync.repository.DocumentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class RAGSearchService {

    @Value("${app.ai.rag-server-url:http://localhost:8000}")
    private String ragServerUrl;

    private final WebClient.Builder webClientBuilder;
    private final DocumentRepository documentRepository;

    @SuppressWarnings("unchecked")
    public Map<String, Object> indexDocument(String documentId, String filePath, String spaceId, int maxTokens) {
        return webClientBuilder.build()
                .post()
                .uri(ragServerUrl + "/index")
                .bodyValue(Map.of(
                        "document_id", documentId,
                        "file_path", filePath,
                        "space_id", spaceId,
                        "max_tokens", maxTokens))
                .retrieve()
                .bodyToMono(Map.class)
                .block();
    }

    @SuppressWarnings("unchecked")
    public List<PassageDTO> search(String query, String spaceId, int topK) {
        return search(query, spaceId, topK, 5, null, true, true);
    }

    @SuppressWarnings("unchecked")
    public List<PassageDTO> search(String query, String spaceId, int topK, List<String> documentIds) {
        return search(query, spaceId, topK, 5, documentIds, true, true);
    }

    @SuppressWarnings("unchecked")
    public List<PassageDTO> search(String query, String spaceId, int topK, List<String> documentIds,
            boolean includeImages) {
        return search(query, spaceId, topK, 5, documentIds, includeImages, true);
    }

    @SuppressWarnings("unchecked")
    public List<PassageDTO> search(String query, String spaceId, int topK, List<String> documentIds,
            boolean includeImages, boolean useReranker) {
        return search(query, spaceId, topK, 5, documentIds, includeImages, useReranker);
    }

    @SuppressWarnings("unchecked")
    public List<PassageDTO> search(String query, String spaceId, int topK, int topKImages, List<String> documentIds,
            boolean includeImages, boolean useReranker) {
        Map<String, Object> requestBody = new java.util.HashMap<>();
        requestBody.put("query", query);
        requestBody.put("space_id", spaceId);
        requestBody.put("top_k", topK);
        requestBody.put("top_k_images", topKImages);
        requestBody.put("include_images", includeImages);
        requestBody.put("use_reranker", useReranker); // Control cross-encoder reranking
        if (documentIds != null && !documentIds.isEmpty()) {
            requestBody.put("document_ids", documentIds);
        }

        List<Map> results = webClientBuilder.build()
                .post()
                .uri(ragServerUrl + "/search")
                .bodyValue(requestBody)
                .retrieve()
                .bodyToFlux(Map.class)
                .collectList()
                .block();

        // Build a map of documentId -> filename for source attribution
        Map<String, String> docFilenames = documentRepository.findBySpaceId(spaceId).stream()
                .collect(Collectors.toMap(StudyDocument::getId, StudyDocument::getOriginalFilename));

        return results.stream()
                .map(r -> mapToPassageDTO(r, docFilenames))
                .toList();
    }

    /**
     * Map ML server response to PassageDTO, handling both text and image chunks.
     */
    @SuppressWarnings("unchecked")
    private PassageDTO mapToPassageDTO(Map<String, Object> r, Map<String, String> docFilenames) {
        String docId = (String) r.getOrDefault("documentId", r.get("document_id"));
        String contentType = (String) r.getOrDefault("contentType", "text");

        PassageDTO.PassageDTOBuilder builder = PassageDTO.builder()
                .chunkId((String) r.get("id"))
                .documentId(docId)
                .documentFilename(docFilenames.getOrDefault(docId, "Unknown"))
                .page(((Number) r.get("page")).intValue())
                .score(((Number) r.get("score")).doubleValue())
                .contentType(contentType);

        // Text content
        if (r.containsKey("text")) {
            builder.text((String) r.get("text"));
        }

        // Image content (for image and mixed chunks)
        if (r.containsKey("imagePath")) {
            builder.imagePath((String) r.get("imagePath"));

            // Construct full image URL for frontend
            String imagePath = (String) r.get("imagePath");
            if (imagePath != null && docId != null) {
                // Extract filename from path
                String filename = imagePath.substring(imagePath.lastIndexOf("/") + 1);
                builder.imageUrl(ragServerUrl + "/images/" + docId + "/" + filename);
            }
        }

        if (r.containsKey("imageUrl")) {
            builder.imageUrl((String) r.get("imageUrl"));
        }

        if (r.containsKey("thumbnail")) {
            builder.thumbnail((String) r.get("thumbnail"));
        }

        if (r.containsKey("imageWidth") && r.get("imageWidth") != null) {
            builder.imageWidth(((Number) r.get("imageWidth")).intValue());
        }

        if (r.containsKey("imageHeight") && r.get("imageHeight") != null) {
            builder.imageHeight(((Number) r.get("imageHeight")).intValue());
        }

        // Visual bounds for Study Mode
        if (r.containsKey("bounds")) {
            builder.bounds((Map<String, Object>) r.get("bounds"));
        }

        return builder.build();
    }

    public void deleteDocument(String documentId) {
        webClientBuilder.build()
                .delete()
                .uri(ragServerUrl + "/documents/" + documentId)
                .retrieve()
                .bodyToMono(Void.class)
                .block();
    }

    /**
     * Get all chunks for a document (with visual bounds for Study Mode).
     * This is the primary API for the chunk-centric architecture.
     */
    @SuppressWarnings("unchecked")
    public Map<String, Object> getDocumentChunks(String documentId) {
        return webClientBuilder.build()
                .get()
                .uri(ragServerUrl + "/chunks/" + documentId)
                .retrieve()
                .bodyToMono(Map.class)
                .block();
    }

    @SuppressWarnings("unchecked")
    public Map<String, Object> renderPage(String filePath, int pageNumber, double scale) {
        return webClientBuilder.build()
                .post()
                .uri(ragServerUrl + "/render")
                .bodyValue(Map.of(
                        "file_path", filePath,
                        "page_number", pageNumber,
                        "scale", scale))
                .retrieve()
                .bodyToMono(Map.class)
                .block();
    }
}
