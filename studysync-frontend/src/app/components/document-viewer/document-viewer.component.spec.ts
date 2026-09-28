import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DocumentViewerComponent } from './document-viewer.component';
import { LayoutService } from '../../services/layout.service';
import { DocumentService } from '../../services/document.service';
import { CommentService } from '../../services/comment.service';
import { of } from 'rxjs';

describe('DocumentViewerComponent', () => {
    let component: DocumentViewerComponent;
    let fixture: ComponentFixture<DocumentViewerComponent>;

    const mockLayoutService = {
        renderPage: jasmine.createSpy('renderPage').and.returnValue(Promise.resolve({ image: 'data:image/png', width: 800, height: 1000 }))
    };

    const mockDocumentService = {
        downloadDocument: jasmine.createSpy('downloadDocument').and.returnValue(Promise.resolve(new Blob()))
    };

    const mockCommentService = {
        getDocumentChunks: jasmine.createSpy('getDocumentChunks').and.returnValue(of({ pages: [] })),
        getCommentsForDocument: jasmine.createSpy('getCommentsForDocument').and.returnValue(of([])),
        createComment: jasmine.createSpy('createComment').and.returnValue(of({}))
    };

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [DocumentViewerComponent],
            providers: [
                { provide: LayoutService, useValue: mockLayoutService },
                { provide: DocumentService, useValue: mockDocumentService },
                { provide: CommentService, useValue: mockCommentService }
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(DocumentViewerComponent);
        component = fixture.componentInstance;

        // Set required inputs
        component.document = {
            id: 'doc1',
            originalFilename: 'test.pdf',
            contentType: 'application/pdf',
            size: 1000,
            spaceId: 'space1',
            indexed: true
        } as any;
        component.spaceId = 'space1';

        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should switch to study mode when automated', () => {
        component.autoStudyMode = true;
        component.ngOnChanges({
            autoStudyMode: {
                currentValue: true,
                previousValue: false,
                firstChange: true,
                isFirstChange: () => true
            }
        });
        expect(component.viewMode()).toBe('study');
    });

    it('should accept AI suggestions input', () => {
        const suggestions = [{ chunkId: 'c1', score: 0.95 }];
        component.aiSuggestions = suggestions;
        fixture.detectChanges();

        // Verify internal state reflects input (though private/internal usage would need e2e or deeper check)
        // Here we just ensure no error on setting input
        expect(component.aiSuggestions.length).toBe(1);
    });
});
