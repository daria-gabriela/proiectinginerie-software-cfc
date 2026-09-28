package com.studysync.controller;

import com.studysync.dto.DocumentDTO;
import com.studysync.service.DocumentManagementService;
import com.studysync.service.RAGSearchService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.Map;

@RestController
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
@Tag(name = "Documents", description = "Document upload and management")
public class DocumentController {

    private final DocumentManagementService documentService;
    private final RAGSearchService ragSearchService;

    @GetMapping("/api/documents/{id}/view")
    @Operation(summary = "View document file in browser (PDF)")
    public ResponseEntity<org.springframework.core.io.Resource> viewDocument(@PathVariable String id) throws IOException {
        DocumentDTO doc = documentService.getDocumentById(id);
        String filePath = documentService.getDocumentFilePath(id);
        
        java.io.File file = new java.io.File(filePath);
        org.springframework.core.io.Resource resource = new org.springframework.core.io.UrlResource(file.toPath().toUri());

        // Header-ul "inline" spune browserului sa-l deschida, nu sa-l descarce
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + doc.getOriginalFilename() + "\"")
                .contentType(MediaType.parseMediaType(doc.getContentType()))
                .body(resource);
    }

    @GetMapping("/api/spaces/{spaceId}/documents")
    @Operation(summary = "List all documents in a space")
    public List<DocumentDTO> getDocuments(@PathVariable String spaceId) {
        return documentService.getDocumentsForSpace(spaceId);
    }

    @PostMapping(value = "/api/spaces/{spaceId}/documents", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Upload a document to a space")
    public ResponseEntity<DocumentDTO> uploadDocument(
            @PathVariable String spaceId,
            @RequestParam("file") MultipartFile file) throws IOException {
        DocumentDTO doc = documentService.uploadDocument(spaceId, file);
        return ResponseEntity.status(HttpStatus.CREATED).body(doc);
    }

    @GetMapping("/api/documents/{id}")
    @Operation(summary = "Get document metadata")
    public DocumentDTO getDocument(@PathVariable String id) {
        return documentService.getDocumentById(id);
    }

    @GetMapping("/api/documents/{id}/download")
    @Operation(summary = "Download document file")
    public ResponseEntity<byte[]> downloadDocument(@PathVariable String id) throws IOException {
        DocumentDTO doc = documentService.getDocumentById(id);
        byte[] content = documentService.downloadDocument(id);
        
        // URL-encode filename to handle Unicode characters (emojis, etc.)
        String encodedFilename = java.net.URLEncoder.encode(doc.getOriginalFilename(), "UTF-8")
                .replace("+", "%20");

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, 
                        "attachment; filename*=UTF-8''" + encodedFilename)
                .contentType(MediaType.parseMediaType(doc.getContentType()))
                .body(content);
    }


    @GetMapping("/api/documents/{id}/chunks")
    @Operation(summary = "Get document chunks with visual bounds for Study Mode")
    public ResponseEntity<Map<String, Object>> getDocumentChunks(@PathVariable String id) {
        documentService.getDocumentById(id);  // Verify access
        
        Map<String, Object> chunks = ragSearchService.getDocumentChunks(id);
        return ResponseEntity.ok(chunks);
    }

    @GetMapping("/api/documents/{id}/render/{page}")
    @Operation(summary = "Render a document page as PNG image")
    public ResponseEntity<Map<String, Object>> renderPage(
            @PathVariable String id,
            @PathVariable int page,
            @RequestParam(defaultValue = "2.0") double scale) {
        documentService.getDocumentById(id);  // Verify access
        String filePath = documentService.getDocumentFilePath(id);
        
        Map<String, Object> result = ragSearchService.renderPage(filePath, page, scale);
        return ResponseEntity.ok(result);
    }

    @DeleteMapping("/api/documents/{id}")
    @Operation(summary = "Delete a document")
    public ResponseEntity<Void> deleteDocument(@PathVariable String id) throws IOException {
        documentService.deleteDocument(id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/api/documents/{id}/settings")
    @Operation(summary = "Update document settings (chunk size)", 
               description = "Updates chunk token size and triggers re-indexing. Warning: This will invalidate existing comments.")
    public ResponseEntity<DocumentDTO> updateDocumentSettings(
            @PathVariable String id,
            @RequestBody Map<String, Object> settings
    ) {
        Integer chunkTokens = null;
        if (settings.containsKey("chunkTokens")) {
            Object value = settings.get("chunkTokens");
            if (value instanceof Number) {
                chunkTokens = ((Number) value).intValue();
            }
        }
        
        DocumentDTO updated = documentService.updateDocumentSettings(id, chunkTokens);
        return ResponseEntity.ok(updated);
    }
}
