package com.studysync.service;

import com.studysync.dto.DocumentDTO;
import com.studysync.dto.WebSocketEvent;
import com.studysync.model.MemberRole;
import com.studysync.model.SpaceMembership;
import com.studysync.model.StudyDocument;
import com.studysync.model.User;
import com.studysync.repository.DocumentRepository;
import com.studysync.repository.SpaceMembershipRepository;
import com.studysync.repository.UserRepository;
import com.studysync.security.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class DocumentManagementService {

    private final DocumentRepository documentRepository;
    private final SpaceMembershipRepository membershipRepository;
    private final UserRepository userRepository;
    private final RAGSearchService ragSearchService;
    private final CommentService commentService;
    private final FileConversionService fileConversionService;
    private final WebSocketService webSocketService;

    private static final Logger log = LoggerFactory.getLogger(DocumentManagementService.class);

    @Value("${app.storage.upload-dir:./uploads}")
    private String uploadDir;

    public List<DocumentDTO> getDocumentsForSpace(String spaceId) {
        requireMembership(spaceId);
        return documentRepository.findBySpaceId(spaceId).stream()
                .map(this::toDTO)
                .toList();
    }

    public DocumentDTO uploadDocument(String spaceId, MultipartFile file) throws IOException {
        requireMembership(spaceId);
        String userId = SecurityUtils.getCurrentUserId();

        Path uploadPath = Paths.get(uploadDir, spaceId);
        Files.createDirectories(uploadPath);

        // 1. Salvăm fișierul original
        String originalName = file.getOriginalFilename();
        String extension = getExtension(originalName).toLowerCase();
        String storedFilename = UUID.randomUUID().toString() + extension;
        Path filePath = uploadPath.resolve(storedFilename);

        Files.copy(file.getInputStream(), filePath);

        File currentFile = filePath.toFile();
        String finalContentType = file.getContentType();

        log.info("Starting upload: {} ({})", originalName, extension);

        // Emit uploading event
        webSocketService.sendDocumentEvent(WebSocketEvent.documentEvent(
                WebSocketEvent.EventType.DOCUMENT_UPLOADING,
                spaceId, null, "Uploading " + originalName, null));

        if (extension.equals(".pptx") || extension.equals(".docx")) {
            log.info("Office format detected, converting to PDF...");

            // Emit converting event
            webSocketService.sendDocumentEvent(WebSocketEvent.documentEvent(
                    WebSocketEvent.EventType.DOCUMENT_CONVERTING,
                    spaceId, null, "Converting " + originalName + " to PDF...", null));

            File pdfFile = fileConversionService.convertToPdf(currentFile);

            if (pdfFile == null) {
                log.error("PDF conversion failed: FileConversionService returned null");
                webSocketService.sendDocumentEvent(WebSocketEvent.documentEvent(
                        WebSocketEvent.EventType.DOCUMENT_ERROR,
                        spaceId, null, "Failed to convert " + originalName + ". Is LibreOffice installed?", null));
            } else if (!pdfFile.exists()) {
                log.error("PDF conversion failed: File does not exist");
            } else {
                log.info("PDF conversion successful: {} bytes", pdfFile.length());
                currentFile.delete();
                currentFile = pdfFile;
                originalName = originalName.substring(0, originalName.lastIndexOf('.')) + ".pdf";
                finalContentType = "application/pdf";
            }
        }

        // 3. Salvare în DB (Acum va folosi valorile de mai sus, care sunt PDF)
        StudyDocument doc = StudyDocument.builder()
                .spaceId(spaceId)
                .uploadedByUserId(userId)
                .originalFilename(originalName) // Va fi .pdf
                .contentType(finalContentType) // Va fi application/pdf
                .storagePath(currentFile.getAbsolutePath()) // Calea către noul PDF
                .fileSize(currentFile.length()) // Mărimea noului PDF
                .indexed(false)
                .createdAt(Instant.now())
                .build();

        doc = documentRepository.save(doc);

        // 4. Trimitem către Python calea către PDF (nu către PPTX)
        // Asta rezolvă definitiv eroarea NoneType de la slide-uri
        triggerIndexingAsync(doc.getId(), currentFile.getAbsolutePath(), spaceId, 400, originalName);

        return toDTO(doc);
    }

    private void triggerIndexingAsync(String documentId, String filePath, String spaceId, int chunkTokens,
            String originalFilename) {
        new Thread(() -> executeIndexing(documentId, filePath, spaceId, chunkTokens, originalFilename)).start();
    }

    // Package-private for testing
    void executeIndexing(String documentId, String filePath, String spaceId, int chunkTokens, String originalFilename) {
        try {
            // Emit indexing event with filename
            webSocketService.sendDocumentEvent(WebSocketEvent.documentEvent(
                    WebSocketEvent.EventType.DOCUMENT_INDEXING,
                    spaceId, documentId, "Indexing " + originalFilename, null));

            // Small pause to ensure file is closed by LibreOffice
            Thread.sleep(1000);

            var result = ragSearchService.indexDocument(documentId, filePath, spaceId, chunkTokens);
            if (result != null && result.containsKey("success") && Boolean.TRUE.equals(result.get("success"))) {
                int chunkCount = result.get("chunk_count") != null ? ((Number) result.get("chunk_count")).intValue()
                        : 0;
                DocumentDTO updatedDoc = markAsIndexed(documentId, chunkCount);

                // Emit ready event with the updated document and filename
                webSocketService.sendDocumentEvent(WebSocketEvent.documentEvent(
                        WebSocketEvent.EventType.DOCUMENT_READY,
                        spaceId, documentId, originalFilename + " ready!", updatedDoc));
            } else {
                String error = result != null ? String.valueOf(result.get("error")) : "Unknown error";
                markIndexingFailed(documentId, error);

                // Emit error event
                webSocketService.sendDocumentEvent(WebSocketEvent.documentEvent(
                        WebSocketEvent.EventType.DOCUMENT_ERROR,
                        spaceId, documentId, "Indexing failed: " + error, null));
            }
        } catch (Exception e) {
            markIndexingFailed(documentId, e.getMessage());

            // Emit error event
            webSocketService.sendDocumentEvent(WebSocketEvent.documentEvent(
                    WebSocketEvent.EventType.DOCUMENT_ERROR,
                    spaceId, documentId, "Error: " + e.getMessage(), null));
        }
    }

    public DocumentDTO getDocumentById(String documentId) {
        StudyDocument doc = documentRepository.findById(documentId).orElseThrow();
        requireMembership(doc.getSpaceId());
        return toDTO(doc);
    }

    public byte[] downloadDocument(String documentId) throws IOException {
        StudyDocument doc = documentRepository.findById(documentId).orElseThrow();
        requireMembership(doc.getSpaceId());
        return Files.readAllBytes(Paths.get(doc.getStoragePath()));
    }

    public void deleteDocument(String documentId) throws IOException {
        StudyDocument doc = documentRepository.findById(documentId).orElseThrow();
        requireOwnership(doc.getSpaceId());

        Files.deleteIfExists(Paths.get(doc.getStoragePath()));

        try {
            ragSearchService.deleteDocument(documentId);
        } catch (Exception e) {
            System.err.println("Warning: Failed to delete document from ML index: " + e.getMessage());
        }

        documentRepository.delete(doc);
    }

    public String getDocumentFilePath(String documentId) {
        StudyDocument doc = documentRepository.findById(documentId).orElseThrow();
        requireMembership(doc.getSpaceId());
        return doc.getStoragePath();
    }

    public DocumentDTO markAsIndexed(String documentId, int chunkCount) {
        StudyDocument doc = documentRepository.findById(documentId).orElseThrow();
        doc.setIndexed(true);
        doc.setChunkCount(chunkCount);
        doc.setProcessingError(null);
        return toDTO(documentRepository.save(doc));
    }

    public DocumentDTO markIndexingFailed(String documentId, String error) {
        StudyDocument doc = documentRepository.findById(documentId).orElseThrow();
        doc.setIndexed(false);
        doc.setProcessingError(error);
        return toDTO(documentRepository.save(doc));
    }

    public DocumentDTO updateDocumentSettings(String documentId, Integer newChunkTokens) {
        StudyDocument doc = documentRepository.findById(documentId).orElseThrow();
        requireMembership(doc.getSpaceId());

        if (newChunkTokens != null) {
            newChunkTokens = Math.max(100, Math.min(1000, newChunkTokens));
        }

        Integer currentChunkTokens = doc.getChunkTokens() != null ? doc.getChunkTokens() : 400;
        boolean needsReindex = newChunkTokens != null && !newChunkTokens.equals(currentChunkTokens);

        if (needsReindex) {
            commentService.deleteCommentsForDocument(documentId);
            doc.setChunkTokens(newChunkTokens);
            doc.setIndexed(false);
            doc.setProcessingError(null);
            doc = documentRepository.save(doc);

            triggerIndexingAsync(
                    doc.getId(),
                    doc.getStoragePath(),
                    doc.getSpaceId(),
                    newChunkTokens,
                    doc.getOriginalFilename());
        }

        return toDTO(doc);
    }

    private void requireMembership(String spaceId) {
        String userId = SecurityUtils.getCurrentUserId();
        if (membershipRepository.findBySpaceIdAndUserId(spaceId, userId).isEmpty()) {
            throw new IllegalStateException("Not a member of this space");
        }
    }

    private void requireOwnership(String spaceId) {
        String userId = SecurityUtils.getCurrentUserId();
        SpaceMembership membership = membershipRepository.findBySpaceIdAndUserId(spaceId, userId)
                .orElseThrow(() -> new IllegalStateException("Not a member of this space"));
        if (membership.getRole() != MemberRole.OWNER) {
            throw new IllegalStateException("Only space owners can delete documents");
        }
    }

    private DocumentDTO toDTO(StudyDocument doc) {
        String uploaderName = userRepository.findById(doc.getUploadedByUserId())
                .map(u -> u.getFirstName() + " " + u.getLastName())
                .orElse("Unknown");

        return DocumentDTO.builder()
                .id(doc.getId())
                .spaceId(doc.getSpaceId())
                .originalFilename(doc.getOriginalFilename())
                .contentType(doc.getContentType())
                .fileSize(doc.getFileSize())
                .totalPages(doc.getTotalPages())
                .indexed(doc.isIndexed())
                .chunkCount(doc.getChunkCount())
                .chunkTokens(doc.getChunkTokens() != null ? doc.getChunkTokens() : 400)
                .processingError(doc.getProcessingError())
                .createdAt(doc.getCreatedAt())
                .uploadedByUserName(uploaderName)
                .build();
    }

    private String getExtension(String filename) {
        if (filename == null)
            return "";
        int dot = filename.lastIndexOf('.');
        return dot >= 0 ? filename.substring(dot) : "";
    }
}