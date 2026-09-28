import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { CommentService, Comment, CreateCommentDTO } from './comment.service';

/**
 * Teste unitare pentru CommentService
 * 
 * Aceste teste verifică:
 * - Obținerea comentariilor pentru un document
 * - Crearea comentariilor (pe documente și pasaje)
 * - Actualizarea comentariilor
 * - Ștergerea comentariilor
 * - Obținerea chunk-urilor pentru Study Mode
 */
describe('CommentService', () => {
    let service: CommentService;
    let httpMock: HttpTestingController;

    // Folosim any pentru mock data pentru flexibilitate
    const mockComments: any[] = [
        {
            id: 'comment1',
            documentId: 'doc1',
            chunkId: 'chunk_001',
            pageNumber: 5,
            selectedText: 'hash map',
            authorUserId: 'user1',
            authorName: 'Andrei Popescu',
            content: 'Acest pasaj este important pentru examen!',
            mentions: [],
            createdAt: '2026-01-27T10:00:00Z'
        },
        {
            id: 'comment2',
            documentId: 'doc1',
            chunkId: 'chunk_002',
            pageNumber: 6,
            authorUserId: 'user2',
            authorName: 'Maria Ionescu',
            content: '@Andrei da, profesorul a menționat asta!',
            mentions: ['Andrei'],
            createdAt: '2026-01-27T10:05:00Z'
        }
    ];

    const mockChunksResponse = {
        pages: {
            1: [
                { id: 'chunk_001', text: 'Primul chunk...', bounds: { x: 0, y: 0, width: 500, height: 100 } },
                { id: 'chunk_002', text: 'Al doilea chunk...', bounds: { x: 0, y: 100, width: 500, height: 80 } }
            ],
            2: [
                { id: 'chunk_003', text: 'Chunk pe pagina 2...', bounds: { x: 0, y: 0, width: 500, height: 120 } }
            ]
        },
        totalChunks: 3
    };

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [HttpClientTestingModule],
            providers: [CommentService]
        });
        service = TestBed.inject(CommentService);
        httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => {
        httpMock.verify();
    });

    // ============================================
    // Teste pentru getCommentsForDocument
    // ============================================

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('should fetch comments for a document', (done) => {
        service.getCommentsForDocument('space123', 'doc1').subscribe(result => {
            expect(result.length).toBe(2);
            expect(result[0].content).toContain('important pentru examen');
            done();
        });

        const req = httpMock.expectOne('/api/spaces/space123/documents/doc1/comments');
        expect(req.request.method).toBe('GET');
        req.flush(mockComments);
    });

    it('should include chunk and page information', (done) => {
        service.getCommentsForDocument('space123', 'doc1').subscribe(result => {
            expect(result[0].chunkId).toBe('chunk_001');
            expect(result[0].pageNumber).toBe(5);
            done();
        });

        const req = httpMock.expectOne('/api/spaces/space123/documents/doc1/comments');
        req.flush(mockComments);
    });

    it('should handle empty comments list', (done) => {
        service.getCommentsForDocument('space123', 'emptyDoc').subscribe(result => {
            expect(result.length).toBe(0);
            done();
        });

        const req = httpMock.expectOne('/api/spaces/space123/documents/emptyDoc/comments');
        req.flush([]);
    });

    // ============================================
    // Teste pentru createComment
    // ============================================

    it('should create a comment', (done) => {
        const createDTO: CreateCommentDTO = {
            documentId: 'doc1',
            chunkId: 'chunk_003',
            pageNumber: 10,
            selectedText: 'selected text',
            content: 'Comentariu nou'
        };

        const createdComment: any = {
            id: 'newComment',
            documentId: 'doc1',
            chunkId: 'chunk_003',
            pageNumber: 10,
            selectedText: 'selected text',
            authorUserId: 'user1',
            authorName: 'Andrei Popescu',
            content: 'Comentariu nou',
            mentions: [],
            createdAt: '2026-01-27T11:00:00Z'
        };

        service.createComment('space123', createDTO).subscribe(result => {
            expect(result.id).toBe('newComment');
            expect(result.content).toBe('Comentariu nou');
            done();
        });

        const req = httpMock.expectOne('/api/spaces/space123/comments');
        expect(req.request.method).toBe('POST');
        expect(req.request.body).toEqual(createDTO);
        req.flush(createdComment);
    });

    it('should handle mentions in comments', (done) => {
        const createDTO: CreateCommentDTO = {
            chunkId: 'chunk_001',
            content: '@Maria @Ion verificați acest pasaj!'
        };

        const createdComment: any = {
            id: 'commentWithMentions',
            documentId: 'doc1',
            chunkId: 'chunk_001',
            authorUserId: 'user1',
            authorName: 'Andrei Popescu',
            content: '@Maria @Ion verificați acest pasaj!',
            mentions: ['Maria', 'Ion'],
            createdAt: '2026-01-27T11:00:00Z'
        };

        service.createComment('space123', createDTO).subscribe(result => {
            expect(result.mentions).toContain('Maria');
            expect(result.mentions).toContain('Ion');
            done();
        });

        const req = httpMock.expectOne('/api/spaces/space123/comments');
        req.flush(createdComment);
    });

    // ============================================
    // Teste pentru updateComment
    // ============================================

    it('should update a comment', (done) => {
        const updatedComment = { ...mockComments[0], content: 'Conținut actualizat' };

        service.updateComment('comment1', 'Conținut actualizat').subscribe(result => {
            expect(result.content).toBe('Conținut actualizat');
            done();
        });

        const req = httpMock.expectOne('/api/comments/comment1');
        expect(req.request.method).toBe('PUT');
        expect(req.request.body).toEqual({ content: 'Conținut actualizat' });
        req.flush(updatedComment);
    });

    // ============================================
    // Teste pentru deleteComment
    // ============================================

    it('should delete a comment', (done) => {
        service.deleteComment('comment1').subscribe(() => done());

        const req = httpMock.expectOne('/api/comments/comment1');
        expect(req.request.method).toBe('DELETE');
        req.flush(null);
    });

    // ============================================
    // Teste pentru getDocumentChunks
    // ============================================

    it('should fetch document chunks for Study Mode', (done) => {
        const chunksResponse = {
            documentId: 'doc1',
            fileName: 'test.pdf',
            fileType: 'pdf',
            pageCount: 2,
            pages: [
                {
                    pageNumber: 1,
                    width: 612,
                    height: 792,
                    chunks: [
                        { id: 'chunk_001', text: 'Primul chunk...', documentId: 'doc1', page: 1, bounds: { x: 0, y: 0, width: 0.8, height: 0.1 } },
                        { id: 'chunk_002', text: 'Al doilea chunk...', documentId: 'doc1', page: 1, bounds: { x: 0, y: 0.1, width: 0.8, height: 0.08 } }
                    ]
                },
                {
                    pageNumber: 2,
                    width: 612,
                    height: 792,
                    chunks: [
                        { id: 'chunk_003', text: 'Chunk pe pagina 2...', documentId: 'doc1', page: 2, bounds: { x: 0, y: 0, width: 0.8, height: 0.12 } }
                    ]
                }
            ]
        };

        service.getDocumentChunks('doc1').subscribe(result => {
            expect(result.pages.length).toBe(2);
            expect(result.pageCount).toBe(2);
            done();
        });

        const req = httpMock.expectOne('/api/documents/doc1/chunks');
        expect(req.request.method).toBe('GET');
        req.flush(chunksResponse);
    });

    it('should include chunk bounds for visual overlay', (done) => {
        const chunksResponse = {
            documentId: 'doc1',
            fileName: 'test.pdf',
            fileType: 'pdf',
            pageCount: 1,
            pages: [
                {
                    pageNumber: 1,
                    width: 612,
                    height: 792,
                    chunks: [
                        { id: 'chunk_001', text: 'Test', documentId: 'doc1', page: 1, bounds: { x: 0.1, y: 0.2, width: 0.8, height: 0.1 } }
                    ]
                }
            ]
        };

        service.getDocumentChunks('doc1').subscribe(result => {
            const chunk = result.pages[0].chunks[0];
            expect(chunk.bounds).toBeDefined();
            expect(chunk.bounds.width).toBe(0.8);
            done();
        });

        const req = httpMock.expectOne('/api/documents/doc1/chunks');
        req.flush(chunksResponse);
    });
});
