package com.studysync.service;

import com.studysync.model.StudyDocument;
import com.studysync.repository.DocumentRepository;
import com.studysync.repository.SpaceMembershipRepository;
import com.studysync.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Map;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class DocumentManagementServiceTest {

        @Mock
        private DocumentRepository documentRepository;
        @Mock
        private SpaceMembershipRepository membershipRepository;
        @Mock
        private UserRepository userRepository;
        @Mock
        private RAGSearchService ragSearchService;
        @Mock
        private CommentService commentService;
        @Mock
        private FileConversionService fileConversionService;
        @Mock
        private WebSocketService webSocketService;

        @InjectMocks
        private DocumentManagementService documentService;

        @BeforeEach
        void setUp() {
                // No specific setup required for purely logic tests
        }

        @Test
        void executeIndexing_Success_ShouldMarkAsIndexed() {
                // Arrange
                String docId = "doc123";
                StudyDocument doc = new StudyDocument();
                doc.setId(docId);
                doc.setIndexed(false);

                when(documentRepository.findById(docId)).thenReturn(Optional.of(doc));
                when(documentRepository.save(any(StudyDocument.class)))
                                .thenAnswer(invocation -> invocation.getArgument(0));

                // Mock RAG success
                Map<String, Object> successResult = Map.of(
                                "success", true,
                                "chunk_count", 15);
                when(ragSearchService.indexDocument(eq(docId), anyString(), anyString(), anyInt()))
                                .thenReturn(successResult);

                // Act
                documentService.executeIndexing(docId, "path/to/file", "space1", 400, "test.pdf");

                // Assert
                verify(ragSearchService).indexDocument(eq(docId), anyString(), anyString(), anyInt());
                verify(documentRepository, times(1)).save(argThat(savedDoc -> savedDoc.isIndexed()
                                && savedDoc.getChunkCount() == 15 && savedDoc.getProcessingError() == null));
        }

        @Test
        void executeIndexing_Failure_ShouldMarkAsFailed() {
                // Arrange
                String docId = "docFail";
                StudyDocument doc = new StudyDocument();
                doc.setId(docId);

                when(documentRepository.findById(docId)).thenReturn(Optional.of(doc));
                when(documentRepository.save(any(StudyDocument.class)))
                                .thenAnswer(invocation -> invocation.getArgument(0));

                // Mock RAG failure with error message
                Map<String, Object> errorResult = Map.of(
                                "success", false,
                                "error", "Python Timeout");
                when(ragSearchService.indexDocument(eq(docId), anyString(), anyString(), anyInt()))
                                .thenReturn(errorResult);

                // Act
                documentService.executeIndexing(docId, "path/to/file", "space1", 400, "test.pdf");

                // Assert
                verify(documentRepository, times(1)).save(
                                argThat(savedDoc -> !savedDoc.isIndexed()
                                                && "Python Timeout".equals(savedDoc.getProcessingError())));
        }

        @Test
        void executeIndexing_Exception_ShouldMarkAsFailed() {
                // Arrange
                String docId = "docEx";
                StudyDocument doc = new StudyDocument();
                doc.setId(docId);

                when(documentRepository.findById(docId)).thenReturn(Optional.of(doc));
                when(documentRepository.save(any(StudyDocument.class)))
                                .thenAnswer(invocation -> invocation.getArgument(0));

                // Mock RAG exception
                when(ragSearchService.indexDocument(eq(docId), anyString(), anyString(), anyInt()))
                                .thenThrow(new RuntimeException("Network Error"));

                // Act
                documentService.executeIndexing(docId, "path/to/file", "space1", 400, "test.pdf");

                // Assert
                verify(documentRepository, times(1)).save(
                                argThat(savedDoc -> !savedDoc.isIndexed()
                                                && "Network Error".equals(savedDoc.getProcessingError())));
        }
}
