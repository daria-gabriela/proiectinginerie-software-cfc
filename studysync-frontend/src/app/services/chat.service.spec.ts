import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ChatService, ChatMessage } from './chat.service';

/**
 * Teste unitare pentru ChatService
 * 
 * Aceste teste verifică:
 * - Obținerea mesajelor din chat
 * - Trimiterea mesajelor în chat
 * - Formatarea corectă a cererilor HTTP
 */
describe('ChatService', () => {
    let service: ChatService;
    let httpMock: HttpTestingController;

    const mockMessages: ChatMessage[] = [
        {
            id: 'msg1',
            spaceId: 'space123',
            authorUserId: 'user1',
            authorName: 'Andrei Popescu',
            content: 'Salut! Ați rezolvat problema 3?',
            createdAt: '2026-01-27T10:00:00Z'
        },
        {
            id: 'msg2',
            spaceId: 'space123',
            authorUserId: 'user2',
            authorName: 'Maria Ionescu',
            content: 'Da, am folosit un heap pentru prioritate.',
            createdAt: '2026-01-27T10:05:00Z'
        },
        {
            id: 'msg3',
            spaceId: 'space123',
            authorUserId: 'user1',
            authorName: 'Andrei Popescu',
            content: 'Mulțumesc! O să verific și eu.',
            createdAt: '2026-01-27T10:10:00Z'
        }
    ];

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [HttpClientTestingModule],
            providers: [ChatService]
        });
        service = TestBed.inject(ChatService);
        httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => {
        httpMock.verify();
    });

    // ============================================
    // Teste pentru getMessages
    // ============================================

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('should fetch messages for a space', (done) => {
        service.getMessages('space123').subscribe(result => {
            expect(result.length).toBe(3);
            expect(result[0].content).toBe('Salut! Ați rezolvat problema 3?');
            done();
        });

        const req = httpMock.expectOne('/api/spaces/space123/chat');
        expect(req.request.method).toBe('GET');
        req.flush(mockMessages);
    });

    it('should return messages in chronological order', (done) => {
        service.getMessages('space123').subscribe(result => {
            // Messages should be oldest to newest
            expect(new Date(result[0].createdAt).getTime())
                .toBeLessThan(new Date(result[1].createdAt).getTime());
            expect(new Date(result[1].createdAt).getTime())
                .toBeLessThan(new Date(result[2].createdAt).getTime());
            done();
        });

        const req = httpMock.expectOne('/api/spaces/space123/chat');
        req.flush(mockMessages);
    });

    it('should handle empty message list', (done) => {
        service.getMessages('emptySpace').subscribe(result => {
            expect(result.length).toBe(0);
            done();
        });

        const req = httpMock.expectOne('/api/spaces/emptySpace/chat');
        req.flush([]);
    });

    it('should include author information', (done) => {
        service.getMessages('space123').subscribe(result => {
            expect(result[0].authorName).toBe('Andrei Popescu');
            expect(result[0].authorUserId).toBe('user1');
            done();
        });

        const req = httpMock.expectOne('/api/spaces/space123/chat');
        req.flush(mockMessages);
    });

    // ============================================
    // Teste pentru sendMessage
    // ============================================

    it('should send a message', (done) => {
        const newMessage: ChatMessage = {
            id: 'msg4',
            spaceId: 'space123',
            authorUserId: 'user1',
            authorName: 'Andrei Popescu',
            content: 'Test message',
            createdAt: '2026-01-27T10:15:00Z'
        };

        service.sendMessage('space123', 'Test message').subscribe(result => {
            expect(result.id).toBe('msg4');
            expect(result.content).toBe('Test message');
            done();
        });

        const req = httpMock.expectOne('/api/spaces/space123/chat');
        expect(req.request.method).toBe('POST');
        expect(req.request.body).toEqual({ content: 'Test message' });
        req.flush(newMessage);
    });

    it('should send message content in correct format', (done) => {
        service.sendMessage('space123', 'Hello World').subscribe(() => done());

        const req = httpMock.expectOne('/api/spaces/space123/chat');
        expect(req.request.body.content).toBe('Hello World');
        req.flush(mockMessages[0]);
    });

    it('should handle special characters in messages', (done) => {
        const specialContent = '@Maria vezi această formulă: O(n log n)';
        
        service.sendMessage('space123', specialContent).subscribe(result => {
            expect(result.content).toBe(specialContent);
            done();
        });

        const req = httpMock.expectOne('/api/spaces/space123/chat');
        expect(req.request.body.content).toBe(specialContent);
        req.flush({ ...mockMessages[0], content: specialContent });
    });

    // ============================================
    // Teste pentru URL patterns
    // ============================================

    it('should use correct API endpoint for get messages', (done) => {
        service.getMessages('testSpace').subscribe(() => done());

        const req = httpMock.expectOne('/api/spaces/testSpace/chat');
        expect(req.request.url).toBe('/api/spaces/testSpace/chat');
        req.flush([]);
    });

    it('should use correct API endpoint for send message', (done) => {
        service.sendMessage('testSpace', 'msg').subscribe(() => done());

        const req = httpMock.expectOne('/api/spaces/testSpace/chat');
        expect(req.request.url).toBe('/api/spaces/testSpace/chat');
        req.flush(mockMessages[0]);
    });
});
