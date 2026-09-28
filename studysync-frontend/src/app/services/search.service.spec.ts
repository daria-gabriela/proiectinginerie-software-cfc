import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { SearchService, PassageResult } from './search.service';

/**
 * Teste unitare pentru SearchService
 * 
 * Aceste teste verifică:
 * - Căutarea pasajelor relevante (RAG search)
 * - Filtrarea după documente specifice
 * - Parametrul topK pentru numărul de rezultate
 */
describe('SearchService', () => {
    let service: SearchService;
    let httpMock: HttpTestingController;

    const mockResults: PassageResult[] = [
        {
            text: 'Un hash map este o structură de date care asociază chei cu valori...',
            documentId: 'doc1',
            documentFilename: 'Algoritmi.pdf',
            page: 15,
            score: 0.95,
            chunkId: 'chunk_001',
            bounds: { x: 50, y: 100, width: 500, height: 80 }
        },
        {
            text: 'Complexitatea operațiilor în hash map este în medie O(1)...',
            documentId: 'doc1',
            documentFilename: 'Algoritmi.pdf',
            page: 16,
            score: 0.89,
            chunkId: 'chunk_002',
            bounds: { x: 50, y: 200, width: 500, height: 60 }
        },
        {
            text: 'Coliziunile în hash map se rezolvă prin chaining sau open addressing...',
            documentId: 'doc2',
            documentFilename: 'Structuri_Date.pdf',
            page: 42,
            score: 0.78,
            chunkId: 'chunk_010'
        }
    ];

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [HttpClientTestingModule],
            providers: [SearchService]
        });
        service = TestBed.inject(SearchService);
        httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => {
        httpMock.verify();
    });

    // ============================================
    // Teste pentru search
    // ============================================

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('should search for passages', async () => {
        const promise = service.search('space123', 'ce este un hash map');

        const req = httpMock.expectOne('/api/spaces/space123/search');
        expect(req.request.method).toBe('POST');
        req.flush(mockResults);

        const result = await promise;
        expect(result.length).toBe(3);
        expect(result[0].text).toContain('hash map');
        expect(result[0].score).toBe(0.95);
    });

    it('should include query in request body', async () => {
        const promise = service.search('space123', 'test query');

        const req = httpMock.expectOne('/api/spaces/space123/search');
        expect(req.request.body.query).toBe('test query');
        req.flush([]);

        await promise;
    });

    it('should use default topK of 10', async () => {
        const promise = service.search('space123', 'test');

        const req = httpMock.expectOne('/api/spaces/space123/search');
        expect(req.request.body.topK).toBe(10);
        req.flush([]);

        await promise;
    });

    it('should allow custom topK parameter', async () => {
        const promise = service.search('space123', 'test', [], 10);

        const req = httpMock.expectOne('/api/spaces/space123/search');
        expect(req.request.body.topK).toBe(10);
        req.flush([]);

        await promise;
    });

    // ============================================
    // Teste pentru filtrare documente
    // ============================================

    it('should filter by specific documents', async () => {
        const documentIds = ['doc1', 'doc2'];
        const promise = service.search('space123', 'hash map', documentIds);

        const req = httpMock.expectOne('/api/spaces/space123/search');
        expect(req.request.body.documentIds).toEqual(documentIds);
        req.flush(mockResults.slice(0, 2));

        const result = await promise;
        expect(result.length).toBe(2);
    });

    it('should send empty array when no document filter', async () => {
        const promise = service.search('space123', 'test');

        const req = httpMock.expectOne('/api/spaces/space123/search');
        expect(req.request.body.documentIds).toEqual([]);
        req.flush([]);

        await promise;
    });

    // ============================================
    // Teste pentru chunk-centric fields
    // ============================================

    it('should return chunk metadata with results', async () => {
        const promise = service.search('space123', 'test');

        const req = httpMock.expectOne('/api/spaces/space123/search');
        req.flush(mockResults);

        const result = await promise;
        expect(result[0].chunkId).toBe('chunk_001');
        expect(result[0].bounds).toBeDefined();
        expect(result[0].bounds?.x).toBe(50);
    });

    it('should handle results without bounds', async () => {
        const promise = service.search('space123', 'test');

        const req = httpMock.expectOne('/api/spaces/space123/search');
        req.flush([mockResults[2]]); // Result without bounds

        const result = await promise;
        expect(result[0].bounds).toBeUndefined();
    });

    // ============================================
    // Teste pentru source attribution
    // ============================================

    it('should include document filename for source attribution', async () => {
        const promise = service.search('space123', 'test');

        const req = httpMock.expectOne('/api/spaces/space123/search');
        req.flush(mockResults);

        const result = await promise;
        expect(result[0].documentFilename).toBe('Algoritmi.pdf');
        expect(result[0].page).toBe(15);
    });

    // ============================================
    // Teste pentru empty results
    // ============================================

    it('should handle empty search results', async () => {
        const promise = service.search('space123', 'nonexistent topic xyz');

        const req = httpMock.expectOne('/api/spaces/space123/search');
        req.flush([]);

        const result = await promise;
        expect(result.length).toBe(0);
    });
});
