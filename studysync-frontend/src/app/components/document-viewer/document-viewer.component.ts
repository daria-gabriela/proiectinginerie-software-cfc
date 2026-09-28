import { Component, Input, Output, EventEmitter, signal, OnInit, OnChanges, SimpleChanges, ElementRef, ViewChild, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { LayoutService, PageRender } from '../../services/layout.service';
import { DocumentService, Document } from '../../services/document.service';
import { CommentService, Comment, CreateCommentDTO, Chunk, DocumentChunks } from '../../services/comment.service';
import { FormsModule } from '@angular/forms';

export type ViewMode = 'native' | 'study' | 'text';

export interface AiSuggestion {
  chunkId: string;
  score: number;
}

export interface ChunkAnchor {
  chunkId: string;
  pageNumber: number;
  text: string;
}

interface PageRenderState {
  pageNumber: number;
  loading: boolean;
  loaded: boolean;
  image: string | null;
  width: number;
  height: number;
}

@Component({
  selector: 'app-document-viewer',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="document-viewer fixed inset-0 bg-black/90 flex flex-col z-50">
      <!-- Header -->
      <header class="bg-gray-900 text-white px-4 py-3 flex items-center justify-between shrink-0">
        <div class="flex items-center gap-4">
          <button (click)="close.emit()" class="p-2 hover:bg-gray-800 rounded-lg transition">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
          <div>
            <h2 class="font-medium">{{ document?.originalFilename }}</h2>
            <p class="text-sm text-gray-400">
              <span *ngIf="documentChunks()">{{ documentChunks()!.pageCount }} page(s) • {{ documentChunks()!.fileType.toUpperCase() }}</span>
            </p>
          </div>
        </div>
        
        <!-- View Mode Toggle -->
        <div class="flex items-center bg-gray-800 rounded-lg p-1">
          <button (click)="setViewMode('native')" [class.bg-primary-600]="viewMode() === 'native'" class="px-3 py-1.5 rounded-md text-sm font-medium transition">Native</button>
          <button (click)="setViewMode('study')" [class.bg-primary-600]="viewMode() === 'study'" class="px-3 py-1.5 rounded-md text-sm font-medium transition">Study Mode</button>
          <button (click)="setViewMode('text')" [class.bg-primary-600]="viewMode() === 'text'" class="px-3 py-1.5 rounded-md text-sm font-medium transition">Text Only</button>
        </div>
        
        <div *ngIf="viewMode() === 'study' && documentChunks()" class="flex items-center gap-4">
          <span class="text-sm text-gray-400">{{ documentChunks()!.pageCount }} pages</span>
          
          <!-- Selection Mode Toggle -->
          <div class="flex items-center gap-2 bg-gray-800 rounded-lg px-2 py-1">
            <span class="text-xs text-gray-400">Select:</span>
            <button (click)="setSelectionMode('all')" 
                    [class.bg-primary-600]="selectionMode() === 'all'"
                    [class.text-white]="selectionMode() === 'all'"
                    class="px-2 py-0.5 rounded text-xs font-medium transition hover:bg-gray-700"
                    title="Select both text and images">
              All
            </button>
            <button (click)="setSelectionMode('text')" 
                    [class.bg-yellow-600]="selectionMode() === 'text'"
                    [class.text-white]="selectionMode() === 'text'"
                    class="px-2 py-0.5 rounded text-xs font-medium transition hover:bg-gray-700"
                    title="Select text chunks only">
              📝 Text
            </button>
            <button (click)="setSelectionMode('image')" 
                    [class.bg-cyan-600]="selectionMode() === 'image'"
                    [class.text-white]="selectionMode() === 'image'"
                    class="px-2 py-0.5 rounded text-xs font-medium transition hover:bg-gray-700"
                    title="Select image chunks only">
              📷 Images
            </button>
          </div>
        </div>

      </header>
      
      <!-- Content Area -->
      <div class="flex-1 flex overflow-hidden">
        <!-- Main Viewer -->
        <div class="flex-1 overflow-hidden bg-gray-800">
          <!-- Skeleton Loading State -->
          <div *ngIf="loading()" class="h-full flex flex-col items-center py-4 gap-4 overflow-hidden">
            <!-- Skeleton for document page -->
            <div class="bg-white shadow-2xl rounded-lg overflow-hidden animate-pulse" style="width: 800px; height: 1000px;">
              <div class="h-full flex flex-col p-8">
                <!-- Header skeleton -->
                <div class="h-8 bg-gray-200 rounded w-3/4 mb-6"></div>
                <div class="h-6 bg-gray-200 rounded w-1/2 mb-8"></div>
                
                <!-- Content skeleton lines -->
                <div class="space-y-4 flex-1">
                  <div class="h-4 bg-gray-200 rounded w-full"></div>
                  <div class="h-4 bg-gray-200 rounded w-5/6"></div>
                  <div class="h-4 bg-gray-200 rounded w-full"></div>
                  <div class="h-4 bg-gray-200 rounded w-4/5"></div>
                  <div class="h-4 bg-gray-200 rounded w-full"></div>
                  <div class="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div class="h-20 bg-gray-200 rounded w-full mt-6"></div>
                  <div class="h-4 bg-gray-200 rounded w-full"></div>
                  <div class="h-4 bg-gray-200 rounded w-5/6"></div>
                  <div class="h-4 bg-gray-200 rounded w-full"></div>
                  <div class="h-4 bg-gray-200 rounded w-2/3"></div>
                  <div class="h-4 bg-gray-200 rounded w-full"></div>
                  <div class="h-4 bg-gray-200 rounded w-4/5"></div>
                  <div class="h-32 bg-gray-200 rounded w-2/3 mx-auto mt-6"></div>
                  <div class="h-4 bg-gray-200 rounded w-full"></div>
                  <div class="h-4 bg-gray-200 rounded w-5/6"></div>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Native View -->
          <iframe *ngIf="!loading() && viewMode() === 'native' && nativeUrl()" [src]="nativeUrl()" class="w-full h-full bg-white"></iframe>
          
          <!-- Study Mode: Scrollable pages -->
          <div *ngIf="!loading() && viewMode() === 'study' && documentChunks()" 
               #scrollContainer 
               class="h-full overflow-y-auto flex flex-col items-center py-4 gap-4">
            <div *ngFor="let pageState of pageRenderStates()"
                 class="page-container relative bg-white shadow-2xl rounded-lg overflow-hidden shrink-0"
                 [attr.data-page]="pageState.pageNumber"
                 [style.width.px]="pageState.width || 800"
                 [style.height.px]="pageState.height || 1000">
              
              <!-- Page number badge -->
              <div class="absolute top-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded z-10">
                Page {{ pageState.pageNumber }}
              </div>
              
              <!-- Page image -->
              <img *ngIf="pageState.loaded && pageState.image" 
                   [src]="pageState.image" 
                   class="absolute inset-0 w-full h-full object-contain">
              
              <!-- Loading state -->
              <div *ngIf="pageState.loading" class="absolute inset-0 flex items-center justify-center bg-gray-100">
                <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
              </div>
              
              <!-- Placeholder -->
              <div *ngIf="!pageState.loaded && !pageState.loading" class="absolute inset-0 flex items-center justify-center bg-gray-100 text-gray-400">
                Page {{ pageState.pageNumber }}
              </div>
              
              <!-- Chunk overlays -->
              <div class="absolute inset-0" style="pointer-events: none;">
                <div *ngFor="let chunk of getChunksForPage(pageState.pageNumber)"
                     class="absolute transition-all duration-200 border-2 rounded group/chunk"
                     [style.left.%]="chunk.bounds.x * 100"
                     [style.top.%]="chunk.bounds.y * 100"
                     [style.width.%]="chunk.bounds.width * 100"
                     [style.height.%]="chunk.bounds.height * 100"
                     [style.pointer-events]="isChunkClickable(chunk) ? 'auto' : 'none'"
                     [class.cursor-pointer]="isChunkClickable(chunk)"
                     [class.opacity-10]="!isChunkClickable(chunk)"
                     [class.hidden]="!isChunkClickable(chunk) && selectionMode() !== 'all'"
                     [class.border-transparent]="!isChunkSelected(chunk) && !isAiSuggested(chunk) && !isImageChunk(chunk)"
                     [class.border-cyan-400]="isImageChunk(chunk) && !isChunkSelected(chunk) && !isAiSuggested(chunk)"
                     [class.border-dashed]="isImageChunk(chunk) && !isChunkSelected(chunk)"
                     [class.bg-yellow-300]="isChunkSelected(chunk)"
                     [class.bg-opacity-50]="isChunkSelected(chunk)"
                     [class.border-yellow-400]="isChunkSelected(chunk)"
                     [class.bg-purple-400]="isAiSuggested(chunk) && !isChunkSelected(chunk)"
                     [class.bg-opacity-30]="isAiSuggested(chunk) && !isChunkSelected(chunk)"
                     [class.border-purple-500]="isAiSuggested(chunk) && !isChunkSelected(chunk)"
                     (click)="onChunkClick(chunk)"
                     [title]="chunk.text || 'Image chunk'">


                  <!-- Comment indicator -->
                  <div *ngIf="hasCommentOnChunk(chunk.id)" class="absolute -right-1 -top-1 w-5 h-5 bg-yellow-500 rounded-full flex items-center justify-center shadow-md z-10">
                    <svg class="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"></path>
                    </svg>
                  </div>
                  <!-- AI score badge -->
                  <div *ngIf="isAiSuggested(chunk)" class="absolute -left-1 -top-1 bg-purple-600 rounded-full px-1.5 py-0.5 text-xs font-bold text-white shadow-md z-10">
                    {{ getAiScore(chunk) }}
                  </div>
                  <!-- Image chunk indicator -->
                  <div *ngIf="isImageChunk(chunk)" 
                       class="absolute -right-1 -bottom-1 bg-cyan-500 rounded-full w-5 h-5 flex items-center justify-center shadow-md z-10"
                       title="Image/Figure">
                    <svg class="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                    </svg>
                  </div>
                  <!-- Thumbnail tooltip on hover for image chunks -->
                  <div *ngIf="isImageChunk(chunk) && chunk.thumbnail" 
                       class="absolute left-full ml-2 top-0 hidden group-hover/chunk:block z-20 pointer-events-none">
                    <div class="bg-gray-900 rounded-lg shadow-xl p-2 border border-cyan-500/50">
                      <img [src]="chunk.thumbnail" class="max-w-32 max-h-32 rounded" alt="Preview">
                      <div class="text-xs text-cyan-300 mt-1 text-center">Image</div>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
          
          <!-- Text Only View -->
          <div *ngIf="!loading() && viewMode() === 'text' && documentChunks()" class="h-full overflow-y-auto p-4">
            <div class="bg-white rounded-lg shadow-2xl p-8 max-w-4xl mx-auto">
              <div *ngFor="let page of documentChunks()!.pages" class="mb-8">
                <div class="text-xs text-gray-400 mb-4 pb-2 border-b">Page {{ page.pageNumber }}</div>
                <div *ngFor="let chunk of page.chunks"
                     class="mb-3 p-3 rounded-lg border-2 cursor-pointer transition-all"
                     [class.border-transparent]="!isChunkSelected(chunk) && !isAiSuggested(chunk)"
                     [class.border-yellow-400]="isChunkSelected(chunk)"
                     [class.bg-yellow-50]="isChunkSelected(chunk)"
                     [class.border-purple-400]="isAiSuggested(chunk) && !isChunkSelected(chunk)"
                     [class.bg-purple-50]="isAiSuggested(chunk) && !isChunkSelected(chunk)"
                     (click)="onChunkClick(chunk)">
                  <p class="text-gray-800 text-sm leading-relaxed">{{ chunk.text }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Comments Sidebar -->
        <div *ngIf="(viewMode() === 'study' || viewMode() === 'text') && (selectedChunk() || showCommentsPanel)"
             class="w-96 bg-gray-900 border-l border-gray-700 flex flex-col shadow-xl z-10">
          
          <!-- Sidebar Header -->
          <div class="p-4 border-b border-gray-700 flex items-center justify-between">
            <h3 class="text-white font-medium">Comments</h3>
            <button (click)="closeSidebar()" class="text-gray-400 hover:text-white">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>
          
          <!-- Sidebar Content -->
          <div class="flex-1 overflow-auto p-4 flex flex-col gap-4">
            <!-- Selected Chunk Info -->
            <div *ngIf="selectedChunk()" class="bg-primary-900/30 border border-primary-500/30 rounded-lg p-3">
              <div class="flex items-center gap-2 text-xs text-primary-400 mb-2 font-medium">
                <span *ngIf="isImageChunk(selectedChunk()!)" class="bg-cyan-500/20 text-cyan-300 px-1.5 py-0.5 rounded">📷 IMAGE</span>
                <span *ngIf="!isImageChunk(selectedChunk()!)">📝 TEXT</span>
                <span>CHUNK (Page {{ selectedChunk()!.page }})</span>
              </div>
              <!-- Show thumbnail for image chunks -->
              <div *ngIf="isImageChunk(selectedChunk()!) && selectedChunk()!.thumbnail" class="mb-2">
                <img [src]="selectedChunk()!.thumbnail" class="max-w-full rounded border border-cyan-500/30" alt="Selected image">
              </div>
              <!-- Show text for text/mixed chunks -->
              <p *ngIf="selectedChunk()!.text" class="text-white text-sm italic border-l-2 border-primary-500 pl-2">{{ selectedChunk()!.text | slice:0:200 }}...</p>
              <!-- Show dimensions for image chunks -->
              <div *ngIf="isImageChunk(selectedChunk()!) && selectedChunk()!.imageWidth" class="text-xs text-gray-400 mt-1">
                {{ selectedChunk()!.imageWidth }}×{{ selectedChunk()!.imageHeight }}px
              </div>
            </div>

            
            <!-- Comment Input -->
            <div *ngIf="selectedChunk()" class="bg-gray-800 rounded-lg p-3 border border-gray-700">
              <textarea [(ngModel)]="newCommentText" 
                        class="w-full bg-gray-700 text-white rounded p-2 text-sm focus:outline-none resize-none"
                        rows="3"
                        placeholder="Add a comment..."></textarea>
              <div class="flex justify-end mt-2">
                <button (click)="submitComment()"
                        [disabled]="!newCommentText.trim() || submittingComment()"
                        class="bg-primary-600 text-white py-1.5 px-4 rounded text-sm font-medium hover:bg-primary-700 disabled:opacity-50">
                  Post
                </button>
              </div>
            </div>
            
            <!-- Comments List -->
            <div *ngFor="let comment of selectedChunkComments()" class="bg-gray-800 rounded-lg p-3 border border-gray-700">
              <div class="flex justify-between items-start mb-2">
                <span class="text-sm font-medium text-gray-200">{{ comment.authorName }}</span>
                <span class="text-xs text-gray-500">{{ comment.createdAt | date:'short' }}</span>
              </div>
              <p class="text-gray-300 text-sm">{{ comment.content }}</p>
            </div>
            
            <!-- No comments message -->
            <div *ngIf="!selectedChunk() && allComments().length === 0" class="text-center py-10 text-gray-500">
              <p>No comments yet</p>
              <p class="text-sm mt-1">Click on a chunk to add one</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`:host { display: contents; }`]
})
export class DocumentViewerComponent implements OnInit, OnChanges, AfterViewInit, OnDestroy {
  @Input() document: Document | null = null;
  @Input() initialPage: number = 1;
  @Input() spaceId: string = '';
  @Input() highlightChunkId: string | null = null;
  @Input() aiSuggestions: AiSuggestion[] = [];
  @Input() autoStudyMode: boolean = false;

  @Output() close = new EventEmitter<void>();
  @Output() addComment = new EventEmitter<ChunkAnchor>();

  @ViewChild('scrollContainer') scrollContainer!: ElementRef<HTMLDivElement>;

  viewMode = signal<ViewMode>('native');
  documentChunks = signal<DocumentChunks | null>(null);
  loading = signal(true);
  nativeUrl = signal<SafeResourceUrl | null>(null);
  selectedChunk = signal<Chunk | null>(null);
  pageRenderStates = signal<PageRenderState[]>([]);

  allComments = signal<Comment[]>([]);
  newCommentText = '';
  submittingComment = signal(false);
  showCommentsPanel = false;

  // Selection Mode: 'all' | 'text' | 'image' - controls which chunks are clickable
  selectionMode = signal<'all' | 'text' | 'image'>('all');


  private blobUrl: string | null = null;
  private renderedPages = new Set<number>();
  private renderQueue = new Set<number>();

  constructor(
    private layoutService: LayoutService,
    private documentService: DocumentService,
    private commentService: CommentService,
    private sanitizer: DomSanitizer
  ) { }

  ngOnInit() {
    if (this.document) {
      this.loadDocument();
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['document'] && this.document) {
      this.loadDocument();
    }
    if (changes['autoStudyMode'] && this.autoStudyMode) {
      this.viewMode.set('study');
    }
    if (changes['highlightChunkId'] && this.highlightChunkId) {
      setTimeout(() => this.scrollToAndHighlightChunk(this.highlightChunkId!), 300);
    }
  }

  ngAfterViewInit() {
    // Observer will be setup after document loads
  }

  ngOnDestroy() {
    if (this.blobUrl) {
      URL.revokeObjectURL(this.blobUrl);
    }
  }

  async loadDocument() {
    if (!this.document) return;

    this.loading.set(true);

    try {
      // Load native file
      const blob = await this.documentService.downloadDocument(this.document.id);
      this.blobUrl = URL.createObjectURL(blob);
      this.updateNativeUrl();

      // Load chunks
      const chunks = await this.commentService.getDocumentChunks(this.document.id).toPromise();
      this.documentChunks.set(chunks || null);

      if (chunks) {
        this.initializePageStates(chunks);
      }

      // Load comments
      this.loadComments();

      if (this.autoStudyMode) {
        this.viewMode.set('study');
      }

      if (this.highlightChunkId) {
        setTimeout(() => this.scrollToAndHighlightChunk(this.highlightChunkId!), 300);
      }
    } catch (err) {
      console.error('Failed to load document', err);
    } finally {
      this.loading.set(false);

      // Setup observer AFTER DOM updates with page containers
      // Use longer timeout to ensure Angular has rendered the containers
      if (this.viewMode() === 'study') {
        setTimeout(() => this.observePages(), 300);
      }
    }
  }

  private initializePageStates(chunks: DocumentChunks) {
    const states: PageRenderState[] = chunks.pages.map(page => ({
      pageNumber: page.pageNumber,
      loading: false,
      loaded: false,
      image: null,
      width: page.width || 800,
      height: page.height || 1000
    }));
    this.pageRenderStates.set(states);
  }

  private observePages() {
    if (!this.scrollContainer?.nativeElement) {
      // console.log('observePages: scrollContainer not ready, retrying in 300ms');
      setTimeout(() => this.observePages(), 300);
      return;
    }

    const containers = this.scrollContainer.nativeElement.querySelectorAll('.page-container');
    // console.log(`observePages: Found ${containers.length} page containers`);

    if (containers.length === 0) {
      // console.log('observePages: No containers yet, retrying in 300ms');
      setTimeout(() => this.observePages(), 300);
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        const pageNum = parseInt(entry.target.getAttribute('data-page') || '0');
        if (entry.isIntersecting && pageNum > 0) {
          // console.log(`Page ${pageNum} is visible, loading image...`);
          this.loadPageImage(pageNum);
        }
      });
    }, { rootMargin: '500px', threshold: 0.01 });

    containers.forEach(c => observer.observe(c));
  }

  private async loadPageImage(pageNumber: number) {
    if (this.renderedPages.has(pageNumber) || this.renderQueue.has(pageNumber)) return;

    this.renderQueue.add(pageNumber);
    this.pageRenderStates.update(states =>
      states.map(s => s.pageNumber === pageNumber ? { ...s, loading: true } : s)
    );

    try {
      const render = await this.layoutService.renderPage(this.document!.id, pageNumber);
      this.pageRenderStates.update(states =>
        states.map(s => s.pageNumber === pageNumber ? {
          ...s, loading: false, loaded: true, image: render.image, width: render.width, height: render.height
        } : s)
      );
      this.renderedPages.add(pageNumber);
    } catch (err) {
      console.error(`Failed to render page ${pageNumber}`, err);
      this.pageRenderStates.update(states =>
        states.map(s => s.pageNumber === pageNumber ? { ...s, loading: false } : s)
      );
    } finally {
      this.renderQueue.delete(pageNumber);
    }
  }

  loadComments() {
    if (!this.document || !this.spaceId) return;
    this.commentService.getCommentsForDocument(this.spaceId, this.document.id).subscribe({
      next: (comments) => this.allComments.set(comments),
      error: (err) => console.error('Failed to load comments', err)
    });
  }

  submitComment() {
    if (!this.document || !this.spaceId || !this.selectedChunk() || !this.newCommentText.trim()) return;

    this.submittingComment.set(true);
    const chunk = this.selectedChunk()!;

    const dto: CreateCommentDTO = {
      documentId: this.document.id,
      chunkId: chunk.id,
      pageNumber: chunk.page,
      selectedText: chunk.text,
      content: this.newCommentText
    };

    this.commentService.createComment(this.spaceId, dto).subscribe({
      next: (comment) => {
        this.allComments.update(comments => [...comments, comment]);
        this.newCommentText = '';
        this.submittingComment.set(false);
      },
      error: (err) => {
        console.error('Failed to post comment', err);
        this.submittingComment.set(false);
      }
    });
  }

  selectedChunkComments(): Comment[] {
    const chunk = this.selectedChunk();
    if (!chunk) return [];
    return this.allComments().filter(c => c.chunkId === chunk.id);
  }

  setViewMode(mode: ViewMode) {
    this.viewMode.set(mode);
    if (mode === 'study') {
      // Wait for Angular to render the containers, then observe pages
      setTimeout(() => {
        // console.log('setViewMode: switching to study, calling observePages');
        this.observePages();
        if (this.highlightChunkId) {
          this.scrollToAndHighlightChunk(this.highlightChunkId);
        }
      }, 300);
    }
  }

  private updateNativeUrl() {
    if (this.blobUrl) {
      const url = `${this.blobUrl}#page=${this.initialPage}`;
      this.nativeUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(url));
    }
  }

  async scrollToAndHighlightChunk(chunkId: string | null) {
    if (!chunkId) return; // Verificare de siguranță pentru ID null

    const chunks = this.documentChunks();
    // Dacă chunks este null sau paginile lipsesc, oprim execuția
    if (!chunks || !chunks.pages || chunks.pages.length === 0) {
      console.warn('Document chunks not loaded yet for highlighting');
      return;
    }

    for (const page of chunks.pages) {
      const chunk = page.chunks.find(c => c.id === chunkId);
      if (chunk) {
        this.selectedChunk.set(chunk);
        this.showCommentsPanel = true;

        // Preload all pages up to and including the target page
        const targetPage = chunk.page;
        // console.log(`Preloading pages 1 to ${targetPage} before scrolling...`);

        const loadPromises: Promise<void>[] = [];
        for (let p = 1; p <= targetPage; p++) {
          if (!this.renderedPages.has(p) && !this.renderQueue.has(p)) {
            loadPromises.push(this.loadPageImage(p));
          }
        }

        // Wait for all pages to load
        if (loadPromises.length > 0) {
          await Promise.all(loadPromises);
          // console.log('All pages preloaded, now scrolling...');
        }

        // Small delay for DOM update, then scroll
        setTimeout(() => {
          const pageElement = this.scrollContainer?.nativeElement?.querySelector(`[data-page="${chunk.page}"]`);
          if (pageElement) {
            pageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 100);
        break;
      }
    }
  }

  getChunksForPage(pageNumber: number): Chunk[] {
    const chunks = this.documentChunks();
    if (!chunks) return [];
    const page = chunks.pages.find(p => p.pageNumber === pageNumber);
    return page?.chunks || [];
  }

  isChunkSelected(chunk: Chunk): boolean {
    return this.selectedChunk()?.id === chunk.id;
  }

  hasCommentOnChunk(chunkId: string): boolean {
    return this.allComments().some(c => c.chunkId === chunkId);
  }

  isAiSuggested(chunk: Chunk): boolean {
    return this.aiSuggestions.some(s => s.chunkId === chunk.id);
  }

  getAiScore(chunk: Chunk): string {
    const suggestion = this.aiSuggestions.find(s => s.chunkId === chunk.id);
    return suggestion ? (suggestion.score * 100).toFixed(0) + '%' : '';
  }

  isImageChunk(chunk: Chunk): boolean {
    return chunk.contentType === 'image' || chunk.contentType === 'mixed';
  }

  /**
   * Check if a chunk is clickable based on current selection mode
   */
  isChunkClickable(chunk: Chunk): boolean {
    const mode = this.selectionMode();
    if (mode === 'all') return true;
    if (mode === 'text') return !this.isImageChunk(chunk);
    if (mode === 'image') return this.isImageChunk(chunk);
    return true;
  }

  setSelectionMode(mode: 'all' | 'text' | 'image') {
    this.selectionMode.set(mode);
  }

  onChunkClick(chunk: Chunk) {
    // Respect selection mode - don't select if chunk type is disabled
    if (!this.isChunkClickable(chunk)) return;

    this.selectedChunk.set(chunk);
    this.showCommentsPanel = true;
    // Forțăm trecerea în Study Mode pentru a vedea comentariile și evidențierea
    if (this.viewMode() !== 'study') {
      this.setViewMode('study');
    }
  }

  closeSidebar() {
    this.selectedChunk.set(null);
    this.showCommentsPanel = false;
  }
}

