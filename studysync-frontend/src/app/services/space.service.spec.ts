import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { SpaceService, StudySpace, CreateSpaceDTO, SpaceMember } from './space.service';

/**
 * Teste unitare pentru SpaceService
 * 
 * Aceste teste verifică:
 * - Obținerea spațiilor utilizatorului
 * - Obținerea unui spațiu specific
 * - Crearea unui spațiu nou
 * - Alăturarea la un spațiu prin cod de invitație
 * - Părăsirea unui spațiu
 */
describe('SpaceService', () => {
    let service: SpaceService;
    let httpMock: HttpTestingController;

    const mockMembers: SpaceMember[] = [
        {
            userId: 'user1',
            firstName: 'Andrei',
            lastName: 'Popescu',
            email: 'andrei@student.com',
            role: 'OWNER'
        },
        {
            userId: 'user2',
            firstName: 'Maria',
            lastName: 'Ionescu',
            email: 'maria@student.com',
            role: 'MEMBER'
        }
    ];

    const mockSpaces: StudySpace[] = [
        {
            id: 'space1',
            name: 'Algoritmi și Structuri de Date',
            description: 'Spațiu de studiu pentru cursul ASD',
            inviteCode: 'ABC12345',
            ownerUserId: 'user1',
            members: mockMembers
        },
        {
            id: 'space2',
            name: 'Inginerie Software',
            description: 'Proiect IS',
            inviteCode: 'XYZ98765',
            ownerUserId: 'user1',
            members: [mockMembers[0]]
        }
    ];

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [HttpClientTestingModule],
            providers: [SpaceService]
        });
        service = TestBed.inject(SpaceService);
        httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => {
        httpMock.verify();
    });

    // ============================================
    // Teste pentru getMySpaces
    // ============================================

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('should fetch user spaces', async () => {
        const promise = service.getMySpaces();

        const req = httpMock.expectOne('/api/spaces');
        expect(req.request.method).toBe('GET');
        req.flush(mockSpaces);

        const result = await promise;
        expect(result.length).toBe(2);
        expect(result[0].name).toBe('Algoritmi și Structuri de Date');
    });

    it('should handle empty spaces list', async () => {
        const promise = service.getMySpaces();

        const req = httpMock.expectOne('/api/spaces');
        req.flush([]);

        const result = await promise;
        expect(result.length).toBe(0);
    });

    // ============================================
    // Teste pentru getSpaceById
    // ============================================

    it('should fetch a specific space by ID', async () => {
        const promise = service.getSpaceById('space1');

        const req = httpMock.expectOne('/api/spaces/space1');
        expect(req.request.method).toBe('GET');
        req.flush(mockSpaces[0]);

        const result = await promise;
        expect(result.id).toBe('space1');
        expect(result.name).toBe('Algoritmi și Structuri de Date');
        expect(result.members.length).toBe(2);
    });

    it('should include member information', async () => {
        const promise = service.getSpaceById('space1');

        const req = httpMock.expectOne('/api/spaces/space1');
        req.flush(mockSpaces[0]);

        const result = await promise;
        expect(result.members[0].firstName).toBe('Andrei');
        expect(result.members[0].role).toBe('OWNER');
    });

    // ============================================
    // Teste pentru createSpace
    // ============================================

    it('should create a new space', async () => {
        const createDTO: CreateSpaceDTO = {
            name: 'Nou Spațiu',
            description: 'Descriere test'
        };
        const createdSpace: StudySpace = {
            id: 'newSpace',
            name: 'Nou Spațiu',
            description: 'Descriere test',
            inviteCode: 'NEW12345',
            ownerUserId: 'user1',
            members: [mockMembers[0]]
        };

        const promise = service.createSpace(createDTO);

        const req = httpMock.expectOne('/api/spaces');
        expect(req.request.method).toBe('POST');
        expect(req.request.body).toEqual(createDTO);
        req.flush(createdSpace);

        const result = await promise;
        expect(result.id).toBe('newSpace');
        expect(result.name).toBe('Nou Spațiu');
        expect(result.inviteCode).toBe('NEW12345');
    });

    // ============================================
    // Teste pentru joinSpace
    // ============================================

    it('should join a space with invite code', async () => {
        const promise = service.joinSpace('ABC12345');

        const req = httpMock.expectOne('/api/spaces/join');
        expect(req.request.method).toBe('POST');
        expect(req.request.body).toEqual({ inviteCode: 'ABC12345' });
        req.flush(mockSpaces[0]);

        const result = await promise;
        expect(result.id).toBe('space1');
    });

    it('should send correct invite code format', async () => {
        const promise = service.joinSpace('TEST1234');

        const req = httpMock.expectOne('/api/spaces/join');
        expect(req.request.body.inviteCode).toBe('TEST1234');
        req.flush(mockSpaces[0]);

        await promise;
    });

    // ============================================
    // Teste pentru leaveSpace
    // ============================================

    it('should leave a space', async () => {
        const promise = service.leaveSpace('space1');

        const req = httpMock.expectOne('/api/spaces/space1/leave');
        expect(req.request.method).toBe('POST');
        expect(req.request.body).toEqual({});
        req.flush(null);

        await promise;
        // If no error, test passes
    });
});
