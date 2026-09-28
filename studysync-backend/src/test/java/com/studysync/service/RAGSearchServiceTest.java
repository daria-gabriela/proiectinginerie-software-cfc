package com.studysync.service;

import com.studysync.dto.PassageDTO;
import com.studysync.model.StudyDocument;
import com.studysync.repository.DocumentRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Teste unitare pentru RAGSearchService
 * 
 * Aceste teste verifică:
 * - Indexarea documentelor (comunicare cu ML Server)
 * - Căutarea în documente (RAG search)
 * - Ștergerea documentelor din index
 * - Obținerea chunk-urilor unui document
 * - Renderizarea paginilor
 */
@ExtendWith(MockitoExtension.class)
class RAGSearchServiceTest {

    @Mock
    private WebClient.Builder webClientBuilder;
    
    @Mock
    private WebClient webClient;
    
    @Mock
    private WebClient.RequestBodyUriSpec requestBodyUriSpec;
    
    @Mock
    private WebClient.RequestBodySpec requestBodySpec;
    
    @Mock
    private WebClient.RequestHeadersSpec requestHeadersSpec;
    
    @Mock
    private WebClient.RequestHeadersUriSpec requestHeadersUriSpec;
    
    @Mock
    private WebClient.ResponseSpec responseSpec;
    
    @Mock
    private DocumentRepository documentRepository;

    @InjectMocks
    private RAGSearchService ragSearchService;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(ragSearchService, "ragServerUrl", "http://localhost:8000");
    }

    // ============================================
    // Teste pentru Index Document
    // ============================================

    @Test
    void indexDocument_Success_ShouldReturnSuccessResult() {
        // Arrange
        Map<String, Object> expectedResult = Map.of(
                "success", true,
                "chunk_count", 25,
                "message", "Document indexed successfully"
        );

        when(webClientBuilder.build()).thenReturn(webClient);
        when(webClient.post()).thenReturn(requestBodyUriSpec);
        when(requestBodyUriSpec.uri(anyString())).thenReturn(requestBodySpec);
        when(requestBodySpec.bodyValue(any())).thenReturn(requestHeadersSpec);
        when(requestHeadersSpec.retrieve()).thenReturn(responseSpec);
        when(responseSpec.bodyToMono(Map.class)).thenReturn(Mono.just(expectedResult));

        // Act
        Map<String, Object> result = ragSearchService.indexDocument(
                "doc123", 
                "/path/to/document.pdf", 
                "space123", 
                400
        );

        // Assert
        assertNotNull(result);
        assertTrue((Boolean) result.get("success"));
        assertEquals(25, result.get("chunk_count"));
    }

    @Test
    void indexDocument_Failure_ShouldReturnErrorResult() {
        // Arrange
        Map<String, Object> errorResult = Map.of(
                "success", false,
                "error", "Failed to parse PDF"
        );

        when(webClientBuilder.build()).thenReturn(webClient);
        when(webClient.post()).thenReturn(requestBodyUriSpec);
        when(requestBodyUriSpec.uri(anyString())).thenReturn(requestBodySpec);
        when(requestBodySpec.bodyValue(any())).thenReturn(requestHeadersSpec);
        when(requestHeadersSpec.retrieve()).thenReturn(responseSpec);
        when(responseSpec.bodyToMono(Map.class)).thenReturn(Mono.just(errorResult));

        // Act
        Map<String, Object> result = ragSearchService.indexDocument(
                "doc123", 
                "/invalid/path.pdf", 
                "space123", 
                400
        );

        // Assert
        assertNotNull(result);
        assertFalse((Boolean) result.get("success"));
        assertEquals("Failed to parse PDF", result.get("error"));
    }

    // ============================================
    // Teste pentru Search
    // ============================================

    @Test
    void search_Success_ShouldReturnPassages() {
        // Arrange
        List<StudyDocument> spaceDocuments = List.of(
                StudyDocument.builder().id("doc1").originalFilename("Algoritmi.pdf").build(),
                StudyDocument.builder().id("doc2").originalFilename("Structuri_Date.pdf").build()
        );

        List<Map> searchResults = List.of(
                Map.of(
                        "text", "Un hash map este o structură de date...",
                        "document_id", "doc1",
                        "page", 15,
                        "score", 0.95,
                        "id", "chunk_001"
                ),
                Map.of(
                        "text", "Complexitatea căutării în hash map este O(1)...",
                        "document_id", "doc1",
                        "page", 16,
                        "score", 0.89,
                        "id", "chunk_002"
                )
        );

        when(webClientBuilder.build()).thenReturn(webClient);
        when(webClient.post()).thenReturn(requestBodyUriSpec);
        when(requestBodyUriSpec.uri(anyString())).thenReturn(requestBodySpec);
        when(requestBodySpec.bodyValue(any())).thenReturn(requestHeadersSpec);
        when(requestHeadersSpec.retrieve()).thenReturn(responseSpec);
        when(responseSpec.bodyToFlux(Map.class)).thenReturn(Flux.fromIterable(searchResults));
        when(documentRepository.findBySpaceId("space123")).thenReturn(spaceDocuments);

        // Act
        List<PassageDTO> result = ragSearchService.search("ce este un hash map", "space123", 5);

        // Assert
        assertNotNull(result);
        assertEquals(2, result.size());
        
        PassageDTO firstResult = result.get(0);
        assertEquals("Un hash map este o structură de date...", firstResult.getText());
        assertEquals("doc1", firstResult.getDocumentId());
        assertEquals("Algoritmi.pdf", firstResult.getDocumentFilename());
        assertEquals(15, firstResult.getPage());
        assertEquals(0.95, firstResult.getScore(), 0.001);
        assertEquals("chunk_001", firstResult.getChunkId());
    }

    @Test
    void search_WithDocumentFilter_ShouldIncludeFilter() {
        // Arrange
        List<StudyDocument> spaceDocuments = List.of(
                StudyDocument.builder().id("doc1").originalFilename("Test.pdf").build()
        );

        List<Map> searchResults = List.of(
                Map.of("text", "Result", "document_id", "doc1", "page", 1, "score", 0.9)
        );

        when(webClientBuilder.build()).thenReturn(webClient);
        when(webClient.post()).thenReturn(requestBodyUriSpec);
        when(requestBodyUriSpec.uri(anyString())).thenReturn(requestBodySpec);
        when(requestBodySpec.bodyValue(argThat(body -> {
            if (body instanceof Map) {
                Map<String, Object> map = (Map<String, Object>) body;
                return map.containsKey("document_ids") && 
                       ((List<?>) map.get("document_ids")).contains("doc1");
            }
            return false;
        }))).thenReturn(requestHeadersSpec);
        when(requestHeadersSpec.retrieve()).thenReturn(responseSpec);
        when(responseSpec.bodyToFlux(Map.class)).thenReturn(Flux.fromIterable(searchResults));
        when(documentRepository.findBySpaceId("space123")).thenReturn(spaceDocuments);

        // Act
        List<PassageDTO> result = ragSearchService.search(
                "query", 
                "space123", 
                5, 
                List.of("doc1")
        );

        // Assert
        assertNotNull(result);
        assertEquals(1, result.size());
    }

    @Test
    void search_EmptyResults_ShouldReturnEmptyList() {
        // Arrange
        when(webClientBuilder.build()).thenReturn(webClient);
        when(webClient.post()).thenReturn(requestBodyUriSpec);
        when(requestBodyUriSpec.uri(anyString())).thenReturn(requestBodySpec);
        when(requestBodySpec.bodyValue(any())).thenReturn(requestHeadersSpec);
        when(requestHeadersSpec.retrieve()).thenReturn(responseSpec);
        when(responseSpec.bodyToFlux(Map.class)).thenReturn(Flux.empty());
        when(documentRepository.findBySpaceId("space123")).thenReturn(List.of());

        // Act
        List<PassageDTO> result = ragSearchService.search("nonexistent query", "space123", 5);

        // Assert
        assertNotNull(result);
        assertTrue(result.isEmpty());
    }

    // ============================================
    // Teste pentru Delete Document
    // ============================================

    @Test
    void deleteDocument_Success_ShouldCallMLServer() {
        // Arrange
        when(webClientBuilder.build()).thenReturn(webClient);
        when(webClient.delete()).thenReturn(requestHeadersUriSpec);
        when(requestHeadersUriSpec.uri(eq("http://localhost:8000/documents/doc123"))).thenReturn(requestHeadersSpec);
        when(requestHeadersSpec.retrieve()).thenReturn(responseSpec);
        when(responseSpec.bodyToMono(Void.class)).thenReturn(Mono.empty());

        // Act
        ragSearchService.deleteDocument("doc123");

        // Assert
        verify(webClient).delete();
        verify(requestHeadersUriSpec).uri("http://localhost:8000/documents/doc123");
    }

    // ============================================
    // Teste pentru Get Document Chunks
    // ============================================

    @Test
    void getDocumentChunks_Success_ShouldReturnChunksWithBounds() {
        // Arrange
        Map<String, Object> expectedResult = Map.of(
                "chunks", List.of(
                        Map.of(
                                "id", "chunk_001",
                                "text", "Primul chunk...",
                                "page", 1,
                                "bounds", Map.of("x", 0, "y", 0, "width", 100, "height", 50)
                        ),
                        Map.of(
                                "id", "chunk_002",
                                "text", "Al doilea chunk...",
                                "page", 1,
                                "bounds", Map.of("x", 0, "y", 50, "width", 100, "height", 50)
                        )
                ),
                "total_chunks", 2
        );

        when(webClientBuilder.build()).thenReturn(webClient);
        when(webClient.get()).thenReturn(requestHeadersUriSpec);
        when(requestHeadersUriSpec.uri(anyString())).thenReturn(requestHeadersSpec);
        when(requestHeadersSpec.retrieve()).thenReturn(responseSpec);
        when(responseSpec.bodyToMono(Map.class)).thenReturn(Mono.just(expectedResult));

        // Act
        Map<String, Object> result = ragSearchService.getDocumentChunks("doc123");

        // Assert
        assertNotNull(result);
        assertTrue(result.containsKey("chunks"));
        assertEquals(2, result.get("total_chunks"));
    }

    // ============================================
    // Teste pentru Render Page
    // ============================================

    @Test
    void renderPage_Success_ShouldReturnImageData() {
        // Arrange
        Map<String, Object> expectedResult = Map.of(
                "image_base64", "iVBORw0KGgoAAAANSUhEUgAA...",
                "width", 612,
                "height", 792,
                "page_number", 1
        );

        when(webClientBuilder.build()).thenReturn(webClient);
        when(webClient.post()).thenReturn(requestBodyUriSpec);
        when(requestBodyUriSpec.uri(anyString())).thenReturn(requestBodySpec);
        when(requestBodySpec.bodyValue(any())).thenReturn(requestHeadersSpec);
        when(requestHeadersSpec.retrieve()).thenReturn(responseSpec);
        when(responseSpec.bodyToMono(Map.class)).thenReturn(Mono.just(expectedResult));

        // Act
        Map<String, Object> result = ragSearchService.renderPage("/path/to/file.pdf", 1, 1.5);

        // Assert
        assertNotNull(result);
        assertTrue(result.containsKey("image_base64"));
        assertEquals(612, result.get("width"));
        assertEquals(792, result.get("height"));
    }
}
