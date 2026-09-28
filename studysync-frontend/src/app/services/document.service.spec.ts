import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { DocumentService, Document, CHUNK_SIZE_PRESETS } from './document.service';

/**
 * Teste unitare pentru DocumentService
 * 
 * Aceste teste verifică:
 * - Obținerea listei de documente dintr-un spațiu
 * - Uploadarea documentelor
 * - Descărcarea documentelor
 * - Ștergerea documentelor
 * - Actualizarea setărilor de chunking
 */
describe('DocumentService', () => {
    let service: DocumentService;
    let httpMock: HttpTestingController;

    const mockDocuments: Document[] = [
        {
            id: 'doc1',
            spaceId: 'space123',
            originalFilename: 'Algoritmi.pdf',
            contentType: 'application/pdf',
            fileSize: 1024000,
            indexed: true,
            chunkCount: 25,
            chunkTokens: 400,
            createdAt: '2026-01-15T10:00:00Z',
            uploadedByUserName: 'Andrei Popescu'
        },
        {
            id: 'doc2',
            spaceId: 'space123',
            originalFilename: 'Structuri_Date.pdf',
            contentType: 'application/pdf',
            fileSize: 2048000,
            indexed: false,
            chunkCount: 0,
            chunkTokens: 400,
            createdAt: '2026-01-16T10:00:00Z',
            uploadedByUserName: 'Maria Ionescu'
        }
    ];

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [HttpClientTestingModule],
            providers: [DocumentService]
        });
        service = TestBed.inject(DocumentService);
        httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => {
        httpMock.verify(); // Verifică că nu sunt cereri HTTP neașteptate
    });

    // ============================================
    // Teste pentru getDocuments
    // ============================================

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('should fetch documents for a space', async () => {
        const promise = service.getDocuments('space123');

        const req = httpMock.expectOne('/api/spaces/space123/documents');
        expect(req.request.method).toBe('GET');
        req.flush(mockDocuments);

        const result = await promise;
        expect(result.length).toBe(2);
        expect(result[0].originalFilename).toBe('Algoritmi.pdf');
    });

    it('should handle empty document list', async () => {
        const promise = service.getDocuments('emptySpace');

        const req = httpMock.expectOne('/api/spaces/emptySpace/documents');
        req.flush([]);

        const result = await promise;
        expect(result.length).toBe(0);
    });

    // ============================================
    // Teste pentru uploadDocument
    // ============================================

    it('should upload a document', async () => {
        const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' });
        const mockResponse: Document = {
            id: 'newDoc',
            spaceId: 'space123',
            originalFilename: 'test.pdf',
            contentType: 'application/pdf',
            fileSize: 12,
            indexed: false,
            chunkCount: 0,
            chunkTokens: 400,
            createdAt: '2026-01-27T10:00:00Z',
            uploadedByUserName: 'Test User'
        };

        const promise = service.uploadDocument('space123', file);

        const req = httpMock.expectOne('/api/spaces/space123/documents');
        expect(req.request.method).toBe('POST');
        expect(req.request.body instanceof FormData).toBeTrue();
        req.flush(mockResponse);

        const result = await promise;
        expect(result.id).toBe('newDoc');
        expect(result.originalFilename).toBe('test.pdf');
    });

    it('should send file in FormData format', async () => {
        const file = new File(['content'], 'document.pdf', { type: 'application/pdf' });
        const promise = service.uploadDocument('space123', file);

        const req = httpMock.expectOne('/api/spaces/space123/documents');
        const formData = req.request.body as FormData;
        expect(formData.get('file')).toBeTruthy();
        req.flush(mockDocuments[0]);

        await promise;
    });

    // ============================================
    // Teste pentru downloadDocument
    // ============================================

    it('should download a document as blob', async () => {
        const mockBlob = new Blob(['PDF content'], { type: 'application/pdf' });

        const promise = service.downloadDocument('doc1');

        const req = httpMock.expectOne('/api/documents/doc1/download');
        expect(req.request.method).toBe('GET');
        expect(req.request.responseType).toBe('blob');
        req.flush(mockBlob);

        const result = await promise;
        expect(result instanceof Blob).toBeTrue();
    });

    // ============================================
    // Teste pentru deleteDocument
    // ============================================

    it('should delete a document', async () => {
        const promise = service.deleteDocument('doc1');

        const req = httpMock.expectOne('/api/documents/doc1');
        expect(req.request.method).toBe('DELETE');
        req.flush(null);

        await promise;
        // If no error, test passes
    });

    // ============================================
    // Teste pentru updateDocumentSettings
    // ============================================

    it('should update document chunk settings', async () => {
        const updatedDoc: Document = { ...mockDocuments[0], chunkTokens: 200 };

        const promise = service.updateDocumentSettings('doc1', 200);

        const req = httpMock.expectOne('/api/documents/doc1/settings');
        expect(req.request.method).toBe('PATCH');
        expect(req.request.body).toEqual({ chunkTokens: 200 });
        req.flush(updatedDoc);

        const result = await promise;
        expect(result.chunkTokens).toBe(200);
    });

    // ============================================
    // Teste pentru CHUNK_SIZE_PRESETS
    // ============================================

    it('should have correct chunk size presets', () => {
        expect(CHUNK_SIZE_PRESETS.length).toBe(3);
        expect(CHUNK_SIZE_PRESETS[0].value).toBe(200); // Fine-grained
        expect(CHUNK_SIZE_PRESETS[1].value).toBe(400); // Standard
        expect(CHUNK_SIZE_PRESETS[2].value).toBe(800); // Coarse
    });
});
