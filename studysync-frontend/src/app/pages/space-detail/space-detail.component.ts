import { Component, OnInit, OnDestroy, signal, NgZone, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { SpaceService, StudySpace } from '../../services/space.service';
import { DocumentService, Document } from '../../services/document.service';
import { SearchService, PassageResult } from '../../services/search.service';
import { ChatService, ChatMessage } from '../../services/chat.service';
import { WebSocketService, WebSocketEvent } from '../../services/websocket.service';
import { NotificationService } from '../../services/notification.service';
import { AuthService } from '../../core/auth.service';
import { ThemeService } from '../../core/theme.service';
import { DocumentViewerComponent, ChunkAnchor, AiSuggestion } from '../../components/document-viewer/document-viewer.component';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-space-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, DocumentViewerComponent, LucideAngularModule],
  template: `
    <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
      <!-- Header -->
      <header class="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div class="max-w-7xl mx-auto px-4 py-4">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-4">
              <a routerLink="/dashboard" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition">
                <lucide-icon name="chevron-left" class="w-5 h-5"></lucide-icon>
              </a>
              <div>
                <h1 class="text-xl font-bold text-gray-900 dark:text-white">{{ space()?.name }}</h1>
                <p class="text-sm text-gray-500 dark:text-gray-400">{{ space()?.description }}</p>
              </div>
            </div>
            
            <div class="flex items-center gap-4">
              <div class="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-3 py-2 rounded-lg">
                <lucide-icon name="link" class="w-4 h-4"></lucide-icon>
                <span class="font-mono">{{ space()?.inviteCode }}</span>
              </div>
              
              <!-- Chat Toggle Button -->
              <button 
                (click)="toggleChat()"
                class="flex items-center gap-2 px-3 py-2 rounded-lg transition"
                [class.bg-primary-100]="chatOpen()"
                [class.text-primary-600]="chatOpen()"
                [class.dark:bg-primary-900]="chatOpen()"
                [class.dark:text-primary-400]="chatOpen()"
                [class.bg-gray-100]="!chatOpen()"
                [class.text-gray-500]="!chatOpen()"
                [class.dark:bg-gray-700]="!chatOpen()"
                [class.dark:text-gray-400]="!chatOpen()"
                [class.hover:bg-gray-200]="!chatOpen()"
                [class.dark:hover:bg-gray-600]="!chatOpen()"
              >
                <lucide-icon name="message-circle" class="w-5 h-5"></lucide-icon>
                <span class="text-sm font-medium">Chat</span>
              </button>
              
              <!-- Theme Toggle -->
              <button 
                (click)="theme.toggleTheme()"
                class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition text-gray-500 dark:text-gray-400"
                [title]="theme.isDarkMode() ? 'Switch to light mode' : 'Switch to dark mode'"
              >
                @if (theme.isDarkMode()) {
                  <lucide-icon name="sun" class="w-5 h-5"></lucide-icon>
                } @else {
                  <lucide-icon name="moon" class="w-5 h-5"></lucide-icon>
                }
              </button>
              
              <!-- User menu -->
              <div class="relative">
                <button 
                  (click)="showUserMenu = !showUserMenu"
                  class="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                >
                  <div class="w-8 h-8 bg-primary-100 dark:bg-primary-900 text-primary-600 dark:text-primary-400 rounded-full flex items-center justify-center font-semibold text-sm">
                    {{ userInitials() }}
                  </div>
                </button>
                
                @if (showUserMenu) {
                  <div class="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 py-2 z-50">
                    <button 
                      (click)="logout()"
                      class="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                    >
                      <lucide-icon name="log-out" class="w-4 h-4"></lucide-icon>
                      Logout
                    </button>
                  </div>
                }
              </div>
            </div>
          </div>
        </div>
      </header>
      
      <main class="max-w-7xl mx-auto px-4 py-8">
        <!-- Search Section -->
        <div class="bg-gradient-to-r from-primary-600 to-accent-600 rounded-2xl p-6 mb-8 shadow-lg overflow-visible">

          <div class="flex items-center gap-3 mb-4">
            <div class="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <lucide-icon name="lightbulb" class="w-5 h-5 text-white"></lucide-icon>
            </div>
            <h2 class="text-white text-lg font-semibold">Ask AI</h2>
          </div>
          <div class="flex gap-3">
            <input
              [(ngModel)]="searchQuery"
              (keyup.enter)="search()"
              placeholder="What do you want to know?"
              class="flex-1 px-4 py-3 rounded-xl border-0 focus:ring-2 focus:ring-white/50 shadow-sm bg-white/90 dark:bg-gray-800 dark:text-white dark:placeholder-gray-400"
            />
            <button 
              (click)="search()"
              [disabled]="searching()"
              class="px-6 py-3 bg-white dark:bg-gray-800 text-primary-600 dark:text-primary-400 font-semibold rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition disabled:opacity-50 flex items-center gap-2 shadow-sm"
            >
              @if (searching()) {
                <lucide-icon name="loader-2" class="w-5 h-5 animate-spin"></lucide-icon>
              } @else {
                <lucide-icon name="search" class="w-5 h-5"></lucide-icon>
              }
              Search
            </button>
            
            <!-- Settings Dropdown -->
            <div class="relative overflow-visible">

              <button 
                (click)="searchSettingsOpen.set(!searchSettingsOpen())"
                [ngClass]="{'bg-white/30': searchSettingsOpen()}"
                class="p-3 bg-white/20 hover:bg-white/30 text-white rounded-xl transition flex items-center justify-center"
                title="Search Settings"
              >
                <lucide-icon name="settings" class="w-5 h-5"></lucide-icon>
              </button>

              
              @if (searchSettingsOpen()) {
                <div class="absolute right-0 top-full mt-2 w-72 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 p-4 z-50 overflow-visible">
                  <h4 class="text-sm font-semibold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
                    <lucide-icon name="sliders" class="w-4 h-4"></lucide-icon>
                    Search Settings
                  </h4>

                  
                  <!-- Top K Results -->
                  <div class="mb-4">
                    <label class="text-xs text-gray-600 dark:text-gray-400 mb-1 block">
                      Results to fetch: <span class="font-medium text-gray-800 dark:text-white">{{ topK() }}</span>
                    </label>
                    <input 
                      type="range" 
                      min="5" 
                      max="50" 
                      step="5"
                      [value]="topK()"
                      (input)="topK.set(+$any($event.target).value)"
                      class="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-primary-600"
                    />
                    <div class="flex justify-between text-[10px] text-gray-400 mt-1">
                      <span>5</span>
                      <span>25</span>
                      <span>50</span>
                    </div>
                  </div>

                  <!-- Top K Images -->
                  @if (includeImagesInQuery()) {
                    <div class="mb-4">
                      <label class="text-xs text-gray-600 dark:text-gray-400 mb-1 block">
                        Image Results: <span class="font-medium text-gray-800 dark:text-white">{{ topKImages() }}</span>
                      </label>
                      <input 
                        type="range" 
                        min="1" 
                        max="20" 
                        step="1"
                        [value]="topKImages()"
                        (input)="topKImages.set(+$any($event.target).value)"
                        class="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-primary-600"
                      />
                      <div class="flex justify-between text-[10px] text-gray-400 mt-1">
                        <span>1</span>
                        <span>10</span>
                        <span>20</span>
                      </div>
                    </div>
                  }
                  
                  <!-- Use Reranker Toggle -->
                  <label class="flex items-center justify-between cursor-pointer group">
                    <div>
                      <span class="text-sm text-gray-700 dark:text-gray-300">Use Reranker</span>
                      <p class="text-[10px] text-gray-500 dark:text-gray-500">Cross-encoder re-ranking for better accuracy</p>
                    </div>
                    <div class="relative">
                      <input 
                        type="checkbox" 
                        [checked]="useReranker()"
                        (change)="useReranker.set($any($event.target).checked)"
                        class="sr-only peer"
                      />
                      <div class="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
                    </div>
                  </label>
                  
                  <div class="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
                    <div class="text-[10px] text-gray-500 dark:text-gray-500">
                      <p class="flex items-center gap-1 mb-1 font-medium">
                        <lucide-icon name="info" class="w-3 h-3"></lucide-icon>
                        How it works:
                      </p>
                      <ul class="list-disc list-inside space-y-0.5 ml-1">
                        <li>Text Search: top {{ topK() }}</li>
                        @if (includeImagesInQuery()) {
                          <li>Image Search: top {{ topKImages() }}</li>
                          <li>Merged & Reranked</li>
                        } @else {
                          <li>Reranker scores candidates</li>
                        }
                      </ul>
                    </div>
                  </div>

                </div>
              }
            </div>
          </div>

          
          <!-- Search Options -->
          <div class="flex flex-wrap items-center gap-4 mt-3 text-sm">
            <!-- Query Mode: Include images toggle -->
            <label class="flex items-center gap-2 cursor-pointer group">
              <input 
                type="checkbox" 
                [checked]="includeImagesInQuery()"
                (change)="includeImagesInQuery.set($any($event.target).checked)"
                class="w-4 h-4 rounded border-white/30 bg-white/20 text-primary-400 focus:ring-primary-400 focus:ring-offset-0"
              />
              <span class="text-white/80 group-hover:text-white transition flex items-center gap-1">
                <lucide-icon name="image" class="w-4 h-4"></lucide-icon>
                Search images too
              </span>
              <span class="text-white/50 text-xs">(multimodal)</span>
            </label>
            
            <!-- Results Filter -->
            <div class="flex items-center gap-2 bg-white/10 rounded-lg px-2 py-1">
              <span class="text-white/70 text-xs">Show:</span>
              <button 
                (click)="resultsFilter.set('all')" 
                [ngClass]="{'bg-white/20 text-white': resultsFilter() === 'all'}"
                class="px-2 py-0.5 rounded text-xs font-medium transition hover:bg-white/10 text-white/70"
              >
                All
              </button>
              <button 
                (click)="resultsFilter.set('text')" 
                [ngClass]="{'bg-yellow-500/30 text-yellow-200': resultsFilter() === 'text'}"
                class="px-2 py-0.5 rounded text-xs font-medium transition hover:bg-white/10 text-white/70 flex items-center gap-1"
              >
                <lucide-icon name="file-text" class="w-3 h-3"></lucide-icon>
                Text
              </button>
              <button 
                (click)="resultsFilter.set('image')" 
                [ngClass]="{'bg-purple-500/30 text-purple-200': resultsFilter() === 'image'}"
                class="px-2 py-0.5 rounded text-xs font-medium transition hover:bg-white/10 text-white/70 flex items-center gap-1"
              >
                <lucide-icon name="image" class="w-3 h-3"></lucide-icon>
                Images
              </button>
            </div>




          </div>
          

          <!-- Search Results with Pagination -->
          @if (searching()) {
            <!-- Skeleton Loader for Search Results -->
            <div class="mt-6 space-y-3">
              @for (i of [1,2,3,4,5]; track i) {
                <div class="w-full bg-white/10 backdrop-blur rounded-xl p-4 animate-pulse">
                  <div class="flex items-center justify-between mb-2">
                    <div class="h-4 bg-white/20 rounded w-48"></div>
                    <div class="h-4 bg-white/20 rounded w-24"></div>
                  </div>
                  <div class="space-y-2">
                    <div class="h-3 bg-white/20 rounded w-full"></div>
                    <div class="h-3 bg-white/20 rounded w-5/6"></div>
                    <div class="h-3 bg-white/20 rounded w-4/6"></div>
                  </div>
                </div>
              }
            </div>
          } @else if (searchResults().length > 0) {
            <div class="mt-6 space-y-3">
              <!-- Results count and pagination info -->
              <div class="flex items-center justify-between text-white/70 text-sm mb-2">
                <span>
                  {{ filteredResults().length }} results
                  @if (resultsFilter() !== 'all') {
                    <span class="text-white/50">({{ searchResults().length }} total, filtered to {{ resultsFilter() }} only)</span>
                  }
                </span>
                <span>Showing {{ paginatedResultsStart() }}-{{ paginatedResultsEnd() }} of {{ filteredResults().length }}</span>
              </div>
              

              @for (result of paginatedResults(); track $index) {
                <button 
                  (click)="openDocumentViewer(result)"
                  class="w-full bg-white/10 backdrop-blur rounded-xl p-4 text-left hover:bg-white/20 transition group"
                >
                  <div class="flex items-center justify-between mb-2">
                    <span class="text-xs text-white/70 font-mono flex items-center gap-2">
                      <!-- Show different icon for image vs text -->
                      @if (result.contentType === 'image') {
                        <lucide-icon name="image" class="w-4 h-4 text-purple-300"></lucide-icon>
                      } @else if (result.contentType === 'mixed') {
                        <lucide-icon name="file-image" class="w-4 h-4 text-blue-300"></lucide-icon>
                      } @else {
                        <lucide-icon name="file-text" class="w-4 h-4"></lucide-icon>
                      }
                      <span class="text-white font-semibold">{{ result.documentFilename || 'Unknown' }}</span>
                      <span class="text-white/50">•</span>
                      Page {{ result.page }} • Score: {{ (result.score * 100).toFixed(0) }}%
                      @if (result.contentType === 'image') {
                        <span class="bg-purple-500/30 text-purple-200 px-2 py-0.5 rounded text-[10px] uppercase">Image</span>
                      }
                    </span>
                    <span class="text-white/70 group-hover:text-white flex items-center gap-1 text-xs">
                      <lucide-icon name="eye" class="w-4 h-4"></lucide-icon>
                      View in document
                    </span>
                  </div>
                  
                  <!-- Content: show thumbnail for images, text for text chunks -->
                  @if (result.contentType === 'image' && result.thumbnail) {
                    <div class="flex items-start gap-3">
                      <img 
                        [src]="result.thumbnail" 
                        [alt]="'Figure from page ' + result.page"
                        class="w-24 h-24 object-cover rounded-lg border border-white/20 cursor-zoom-in"
                        (click)="expandImage(result, $event)"
                      />
                      <div class="flex-1 text-white/60 text-sm italic">
                        @if (result.imageWidth && result.imageHeight) {
                          <p>Image: {{ result.imageWidth }}×{{ result.imageHeight }}px</p>
                        }
                        <p class="mt-1">Click to view in document</p>
                      </div>
                    </div>
                  } @else if (result.contentType === 'mixed' && result.thumbnail) {
                    <div class="flex items-start gap-3">
                      <img 
                        [src]="result.thumbnail" 
                        [alt]="'Figure from page ' + result.page"
                        class="w-20 h-20 object-cover rounded-lg border border-white/20"
                      />
                      <p class="flex-1 text-white text-sm line-clamp-3">{{ result.text }}</p>
                    </div>
                  } @else {
                    <p class="text-white text-sm line-clamp-3">{{ result.text }}</p>
                  }
                </button>
              }

              
              <!-- Pagination Controls -->
              @if (totalPages() > 1) {
                <div class="flex items-center justify-center gap-2 mt-4 pt-4 border-t border-white/20">
                  <button 
                    (click)="previousPage()"
                    [disabled]="currentPage() === 1"
                    class="px-3 py-1.5 bg-white/10 rounded-lg text-white text-sm hover:bg-white/20 transition disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1"
                  >
                    <lucide-icon name="chevron-left" class="w-4 h-4"></lucide-icon>
                    Previous
                  </button>
                  
                  <div class="flex items-center gap-1">
                    @for (page of visiblePages(); track page) {
                      @if (page === '...') {
                        <span class="px-2 text-white/50">...</span>
                      } @else {
                        <button 
                          (click)="goToPage(+page)" 
                          class="w-8 h-8 rounded-lg text-sm font-medium transition"
                          [ngClass]="{
                            'bg-white text-primary-600': currentPage() === +page,
                            'bg-white/10 text-white hover:bg-white/20': currentPage() !== +page
                          }">{{ page }}</button>
                      }
                    }
                  </div>
                  
                  <button 
                    (click)="nextPage()"
                    [disabled]="currentPage() === totalPages()"
                    class="px-3 py-1.5 bg-white/10 rounded-lg text-white text-sm hover:bg-white/20 transition disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1"
                  >
                    Next
                    <lucide-icon name="chevron-right" class="w-4 h-4"></lucide-icon>
                  </button>
                </div>
              }
            </div>
          }
        </div>
        
        <!-- Documents Section -->
        <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
          <div class="flex items-center justify-between mb-6">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 bg-primary-100 dark:bg-primary-900 rounded-lg flex items-center justify-center">
                <lucide-icon name="folder" class="w-5 h-5 text-primary-600 dark:text-primary-400"></lucide-icon>
              </div>
              <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Documents</h2>
            </div>
            <label class="cursor-pointer bg-primary-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-primary-700 transition flex items-center gap-2">
              <lucide-icon name="upload" class="w-5 h-5"></lucide-icon>
              Upload
              <input type="file" class="hidden" (change)="uploadFile($event)" accept=".pdf,.docx,.pptx,.txt" />
            </label>
          </div>
          
          <!-- Skeleton Loader for Documents -->
          @if (loadingDocuments()) {
            <div class="space-y-3">
              @for (i of [1,2,3]; track i) {
                <div class="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl animate-pulse">
                  <div class="w-5 h-5 mr-3 bg-gray-200 dark:bg-gray-600 rounded"></div>
                  <div class="flex items-center gap-4 flex-1">
                    <div class="w-12 h-12 bg-gray-200 dark:bg-gray-600 rounded-xl"></div>
                    <div class="flex-1">
                      <div class="h-5 bg-gray-200 dark:bg-gray-600 rounded w-48 mb-2"></div>
                      <div class="h-4 bg-gray-200 dark:bg-gray-600 rounded w-72"></div>
                    </div>
                  </div>
                  <div class="flex gap-2">
                    <div class="w-9 h-9 bg-gray-200 dark:bg-gray-600 rounded-lg"></div>
                    <div class="w-9 h-9 bg-gray-200 dark:bg-gray-600 rounded-lg"></div>
                  </div>
                </div>
              }
            </div>
          } @else if (documents().length === 0) {
            <div class="text-center py-12 text-gray-500 dark:text-gray-400">
              <lucide-icon name="file-text" class="mx-auto h-12 w-12 text-gray-400 mb-3"></lucide-icon>
              <h3 class="font-medium text-gray-900 dark:text-white mb-1">No documents yet</h3>
              <p>Upload PDFs, DOCX, or PPTX files to get started.</p>
            </div>
          } @else {
            <div class="space-y-3">
              @for (doc of documents(); track doc.id) {
                <div class="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition group">
                  <input type="checkbox" (change)="toggleDocumentSelection(doc.id)" class="w-5 h-5 mr-3 rounded border-gray-300">
                  <button 
                    (click)="openDocumentViewerByDoc(doc)"
                    class="flex items-center gap-4 flex-1 text-left"
                  >
                    <div class="w-12 h-12 bg-primary-100 dark:bg-primary-900 text-primary-600 dark:text-primary-400 rounded-xl flex items-center justify-center">
                      <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>
                      </svg>
                    </div>
                    <div>
                      <p class="font-medium text-gray-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition">{{ doc.originalFilename }}</p>
                      <p class="text-sm text-gray-500 dark:text-gray-400">
                        {{ formatFileSize(doc.fileSize) }} • 
                        Uploaded by {{ doc.uploadedByUserName }}
                        @if (doc.indexed) {
                          <span class="text-green-600 dark:text-green-400 font-medium">• Indexed ({{ doc.chunkCount }} chunks, {{ doc.chunkTokens || 400 }} tokens)</span>
                        } @else {
                          <span class="text-yellow-600 dark:text-yellow-400 animate-pulse">• Processing...</span>
                        }
                      </p>
                    </div>
                  </button>
                  <div class="flex items-center gap-2">
                    <!-- Chunk Size Settings -->
                    <div class="relative">
                      <button 
                        (click)="toggleChunkSettings(doc.id); $event.stopPropagation()"
                        class="text-gray-400 hover:text-primary-600 p-2 hover:bg-white rounded-lg transition"
                        title="Chunk Size Settings"
                      >
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                        </svg>
                      </button>
                      
                      @if (chunkSettingsOpen() === doc.id) {
                        <div class="absolute right-0 top-full mt-2 w-72 bg-white rounded-xl shadow-xl border border-gray-200 z-50 p-4" (click)="$event.stopPropagation()">
                          <div class="flex items-center justify-between mb-3">
                            <h4 class="font-medium text-gray-900">Chunk Size</h4>
                            <button (click)="chunkSettingsOpen.set(null)" class="text-gray-400 hover:text-gray-600">
                              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                              </svg>
                            </button>
                          </div>
                          
                          <div class="space-y-2 mb-3">
                            <button 
                              (click)="updateChunkSize(doc, 200)"
                              [class.bg-primary-100]="(doc.chunkTokens || 400) === 200"
                              [class.border-primary-500]="(doc.chunkTokens || 400) === 200"
                              class="w-full text-left p-2 rounded-lg border border-gray-200 hover:border-primary-300 transition text-sm"
                            >
                              <span class="font-medium">Fine-grained</span>
                              <span class="text-gray-500 ml-1">(200 tokens)</span>
                              <p class="text-xs text-gray-400">Sentence-level chunks</p>
                            </button>
                            <button 
                              (click)="updateChunkSize(doc, 400)"
                              [class.bg-primary-100]="(doc.chunkTokens || 400) === 400"
                              [class.border-primary-500]="(doc.chunkTokens || 400) === 400"
                              class="w-full text-left p-2 rounded-lg border border-gray-200 hover:border-primary-300 transition text-sm"
                            >
                              <span class="font-medium">Standard</span>
                              <span class="text-gray-500 ml-1">(400 tokens)</span>
                              <p class="text-xs text-gray-400">Paragraph-level chunks — Default</p>
                            </button>
                            <button 
                              (click)="updateChunkSize(doc, 800)"
                              [class.bg-primary-100]="(doc.chunkTokens || 400) === 800"
                              [class.border-primary-500]="(doc.chunkTokens || 400) === 800"
                              class="w-full text-left p-2 rounded-lg border border-gray-200 hover:border-primary-300 transition text-sm"
                            >
                              <span class="font-medium">Coarse</span>
                              <span class="text-gray-500 ml-1">(800 tokens)</span>
                              <p class="text-xs text-gray-400">Section-level chunks</p>
                            </button>
                          </div>
                          
                          <div class="border-t pt-3">
                            <label class="text-xs text-gray-500 block mb-1">Custom (100-1000)</label>
                            <div class="flex gap-2">
                              <input 
                                type="number" 
                                [(ngModel)]="customChunkTokens"
                                min="100" 
                                max="1000" 
                                class="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                                placeholder="e.g. 300"
                              >
                              <button 
                                (click)="applyCustomChunkSize(doc)"
                                class="px-3 py-1.5 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700 transition"
                              >
                                Apply
                              </button>
                            </div>
                          </div>
                          
                          <p class="mt-3 text-xs text-amber-600 bg-amber-50 p-2 rounded">
                            ⚠️ Changing chunk size will re-index and remove existing comments.
                          </p>
                        </div>
                      }
                    </div>
                    
                    <button 
                      (click)="downloadDocument(doc)"
                      class="text-gray-400 hover:text-primary-600 p-2 hover:bg-white rounded-lg transition"
                      title="Download"
                    >
                      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
                      </svg>
                    </button>
                    @if (isOwner()) {
                      <button 
                        (click)="deleteDocument(doc.id)"
                        class="text-gray-400 hover:text-red-600 p-2 hover:bg-white rounded-lg transition"
                        title="Delete"
                      >
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                        </svg>
                      </button>
                    }
                  </div>
                </div>
              }
            </div>
          }
        </div>
      </main>
      
      <!-- Chat Panel -->
      @if (chatOpen()) {
        <div class="fixed right-0 top-0 h-full w-96 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 shadow-xl z-40 flex flex-col">
          <!-- Chat Header -->
          <div class="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <div class="flex items-center gap-2">
              <lucide-icon name="message-circle" class="w-5 h-5 text-primary-600 dark:text-primary-400"></lucide-icon>
              <h3 class="font-semibold text-gray-900 dark:text-white">Space Chat</h3>
            </div>
            <button 
              (click)="toggleChat()"
              class="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition text-gray-500 dark:text-gray-400"
            >
              <lucide-icon name="x" class="w-5 h-5"></lucide-icon>
            </button>
          </div>
          
          <!-- Messages List -->
          <div #chatContainer class="flex-1 overflow-y-auto p-4 space-y-4">
            @if (chatMessages().length === 0) {
              <div class="text-center text-gray-500 dark:text-gray-400 py-8">
                <lucide-icon name="message-circle" class="w-12 h-12 mx-auto mb-2 opacity-50"></lucide-icon>
                <p>No messages yet</p>
                <p class="text-sm">Start the conversation!</p>
              </div>
            } @else {
              @for (msg of chatMessages(); track msg.id) {
                <div class="flex gap-3" [class.flex-row-reverse]="msg.authorUserId === currentUserId()">
                  <div class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0"
                       [class.bg-primary-100]="msg.authorUserId === currentUserId()"
                       [class.text-primary-600]="msg.authorUserId === currentUserId()"
                       [class.dark:bg-primary-900]="msg.authorUserId === currentUserId()"
                       [class.dark:text-primary-400]="msg.authorUserId === currentUserId()"
                       [class.bg-gray-200]="msg.authorUserId !== currentUserId()"
                       [class.text-gray-600]="msg.authorUserId !== currentUserId()"
                       [class.dark:bg-gray-700]="msg.authorUserId !== currentUserId()"
                       [class.dark:text-gray-300]="msg.authorUserId !== currentUserId()">
                    {{ getInitials(msg.authorName) }}
                  </div>
                  <div class="flex-1 max-w-[75%]" [class.text-right]="msg.authorUserId === currentUserId()">
                    <div class="text-xs text-gray-500 dark:text-gray-400 mb-1">
                      {{ msg.authorName }} • {{ formatTime(msg.createdAt) }}
                    </div>
                    <div class="inline-block px-3 py-2 rounded-xl text-sm"
                         [class.bg-primary-600]="msg.authorUserId === currentUserId()"
                         [class.text-white]="msg.authorUserId === currentUserId()"
                         [class.bg-gray-100]="msg.authorUserId !== currentUserId()"
                         [class.dark:bg-gray-700]="msg.authorUserId !== currentUserId()"
                         [class.text-gray-900]="msg.authorUserId !== currentUserId()"
                         [class.dark:text-white]="msg.authorUserId !== currentUserId()">
                      {{ msg.content }}
                    </div>
                  </div>
                </div>
              }
            }
          </div>
          
          <!-- Message Input -->
          <div class="p-4 border-t border-gray-200 dark:border-gray-700">
            <div class="flex items-center gap-2">
              <input
                [(ngModel)]="chatInput"
                (keyup.enter)="sendChatMessage()"
                placeholder="Type a message..."
                class="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              />
              <button 
                (click)="sendChatMessage()"
                [disabled]="!chatInput.trim()"
                class="p-2 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                title="Send message"
              >
                <lucide-icon name="send" class="w-5 h-5"></lucide-icon>
              </button>
            </div>
          </div>
        </div>
      }
      
      <!-- Document Viewer Modal -->
      @if (viewerOpen()) {
        <app-document-viewer
          [document]="viewerDocument()"
          [initialPage]="viewerPage() || 1"
          [spaceId]="spaceId"
          [highlightChunkId]="highlightChunkId()"
          [aiSuggestions]="currentAiSuggestions()"
          [autoStudyMode]="autoStudyMode()"
          (close)="closeViewer()"
          (addComment)="onAddComment($event)"
        ></app-document-viewer>
      }
      
      <!-- Image Lightbox Modal -->
      @if (expandedImage()) {
        <div 
          class="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-8"
          (click)="closeExpandedImage()"
        >
          <div class="relative max-w-4xl max-h-full">
            <button 
              (click)="closeExpandedImage()"
              class="absolute -top-12 right-0 text-white/70 hover:text-white transition"
            >
              <lucide-icon name="x" class="w-8 h-8"></lucide-icon>
            </button>
            <img 
              [src]="expandedImage()?.imageUrl || expandedImage()?.thumbnail" 
              [alt]="'Image from page ' + expandedImage()?.page"
              class="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl"
              (click)="$event.stopPropagation()"
            />
            <div class="mt-4 text-center text-white/70 text-sm">
              <span>{{ expandedImage()?.documentFilename }}</span>
              <span class="mx-2">•</span>
              <span>Page {{ expandedImage()?.page }}</span>
              @if (expandedImage()?.imageWidth && expandedImage()?.imageHeight) {
                <span class="mx-2">•</span>
                <span>{{ expandedImage()?.imageWidth }}×{{ expandedImage()?.imageHeight }}px</span>
              }
            </div>
            <button 
              (click)="openDocumentViewerFromImage(); $event.stopPropagation()"
              class="mt-4 mx-auto block px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition"
            >
              <lucide-icon name="eye" class="w-4 h-4 inline mr-2"></lucide-icon>
              View in document
            </button>
          </div>
        </div>
      }
    </div>
  `

})
export class SpaceDetailComponent implements OnInit, OnDestroy {
  space = signal<StudySpace | null>(null);
  documents = signal<Document[]>([]);
  searchResults = signal<PassageResult[]>([]);
  searching = signal(false);
  loadingDocuments = signal(true);  // For skeleton loader
  showUserMenu = false;

  // Pagination state
  currentPage = signal(1);
  readonly resultsPerPage = 5;

  // Document viewer state
  viewerOpen = signal(false);
  viewerDocument = signal<Document | null>(null);
  viewerPage = signal<number | null>(null);
  highlightChunkId = signal<string | null>(null);      // Chunk to highlight and scroll to
  currentAiSuggestions = signal<AiSuggestion[]>([]);   // AI suggestions to show as purple
  autoStudyMode = signal(false);                       // Auto-switch to study mode

  // Chunk settings
  chunkSettingsOpen = signal<string | null>(null);     // Document ID with open settings
  customChunkTokens = 400;                             // Custom chunk token input

  searchQuery = '';

  // Search mode controls
  includeImagesInQuery = signal(true);    // Query images too (multimodal search)
  resultsFilter = signal<'all' | 'text' | 'image'>('all');  // Filter displayed results
  searchSettingsOpen = signal(false);     // Settings dropdown visibility
  topK = signal(10);                      // Number of results to return
  topKImages = signal(5);                 // Number of image results to return
  useReranker = signal(true);             // Use cross-encoder reranking


  spaceId = '';


  selectedDocumentIds: string[] = [];

  // Chat state
  chatOpen = signal(false);
  chatMessages = signal<ChatMessage[]>([]);
  chatInput = '';
  @ViewChild('chatContainer') chatContainer!: ElementRef;

  // Image lightbox state
  expandedImage = signal<PassageResult | null>(null);


  private pollingInterval: any = null;
  private readonly POLL_INTERVAL_MS = 5000;  // Fallback polling (less frequent with WebSocket)
  private wsDocUnsubscribe: (() => void) | null = null;
  private wsChatUnsubscribe: (() => void) | null = null;
  private wsCommentUnsubscribe: (() => void) | null = null;

  constructor(
    private route: ActivatedRoute,
    private spaceService: SpaceService,
    private documentService: DocumentService,
    private searchService: SearchService,
    private chatService: ChatService,
    private webSocketService: WebSocketService,
    private notificationService: NotificationService,
    private auth: AuthService,
    private ngZone: NgZone,
    public theme: ThemeService
  ) { }

  ngOnInit() {
    this.spaceId = this.route.snapshot.paramMap.get('id') || '';
    this.loadSpace();
    this.loadDocuments();
    this.setupWebSocket();
  }

  ngOnDestroy() {
    this.stopPolling();
    // Cleanup WebSocket subscriptions
    this.wsDocUnsubscribe?.();
    this.wsChatUnsubscribe?.();
    this.wsCommentUnsubscribe?.();
  }

  /**
   * Set up WebSocket subscriptions for real-time updates
   */
  private setupWebSocket() {
    // Subscribe to document events
    this.wsDocUnsubscribe = this.webSocketService.subscribeToDocuments(this.spaceId, (event) => {
      this.handleDocumentEvent(event);
    });

    // Subscribe to chat events (replaces polling)
    this.wsChatUnsubscribe = this.webSocketService.subscribeToChat(this.spaceId, (event) => {
      this.handleChatEvent(event);
    });

    // Subscribe to comment events for real-time notifications
    this.wsCommentUnsubscribe = this.webSocketService.subscribeToComments(this.spaceId, (event) => {
      this.handleCommentEvent(event);
    });
  }

  /**
   * Handle incoming comment WebSocket events
   */
  private handleCommentEvent(event: WebSocketEvent) {
    console.log('[WebSocket] Comment event received:', event);
    const currentUserId = this.auth.user()?.id;
    console.log('[WebSocket] Current user ID:', currentUserId, 'Event user ID:', event.userId);

    // Don't show notification for own comments
    if (event.userId === currentUserId) {
      console.log('[WebSocket] Skipping notification - own comment');
      return;
    }

    switch (event.type) {
      case 'COMMENT_ADDED':
        const authorName = event.payload?.authorName || 'Someone';
        const docName = event.payload?.documentFilename || 'a document';
        const commentPreview = event.payload?.text?.substring(0, 50) || '';
        const documentId = event.payload?.documentId;
        const pageNumber = event.payload?.pageNumber || 1;
        const chunkId = event.payload?.chunkId;

        console.log('[WebSocket] Showing notification for comment from:', authorName);
        this.notificationService.show({
          type: 'info',
          title: `💬 New comment from ${authorName}`,
          message: `On ${docName}: "${commentPreview}${commentPreview.length >= 50 ? '...' : ''}"`,
          autoClose: true,
          duration: 10000,
          clickable: true,
          onClick: () => {
            // Navigate to the document and page where the comment was placed
            if (documentId) {
              const doc = this.documents().find(d => d.id === documentId);
              if (doc) {
                this.viewerDocument.set(doc);
                this.viewerPage.set(pageNumber);
                this.highlightChunkId.set(chunkId || null);
                this.currentAiSuggestions.set([]);
                this.autoStudyMode.set(true);  // Study mode to see comments
                this.viewerOpen.set(true);
                console.log('[WebSocket] Navigating to document:', documentId, 'page:', pageNumber);
              }
            }
          }
        });
        break;
    }
  }

  /**
   * Handle incoming document WebSocket events
   */
  private handleDocumentEvent(event: WebSocketEvent) {
    // Extract filename from message (e.g., "Uploading document.pdf" -> "document.pdf")
    const extractFilename = (msg: string | undefined): string => {
      if (!msg) return 'document';
      // Match patterns like "Uploading X", "Converting X to PDF...", "Indexing X", "X ready!"
      const patterns = [
        /^Uploading (.+)$/i,
        /^Converting (.+) to PDF\.{0,3}$/i,
        /^Indexing (.+)$/i,
        /^(.+) ready!$/i,
        /^Failed to convert (.+)\.?/i,
        /^Indexing failed: (.+)/i,
      ];
      for (const pattern of patterns) {
        const match = msg.match(pattern);
        if (match) return match[1].trim();
      }
      return 'document';
    };

    // Normalize key by removing extension - so .docx and .pdf map to same notification
    const normalizeKey = (filename: string): string => {
      return filename.replace(/\.(pdf|docx|pptx|txt|doc|ppt)$/i, '');
    };

    const rawFilename = extractFilename(event.message);
    const notificationId = `upload-${normalizeKey(rawFilename)}`;
    const displayName = rawFilename.length > 30 ? rawFilename.substring(0, 27) + '...' : rawFilename;

    switch (event.type) {
      case 'DOCUMENT_UPLOADING':
        this.notificationService.showProgress({
          id: notificationId,
          title: displayName,
          message: 'Uploading...',
          progressStatus: 'uploading'
        });
        break;
      case 'DOCUMENT_CONVERTING':
        this.notificationService.showProgress({
          id: notificationId,
          title: displayName,
          message: 'Converting to PDF...',
          progressStatus: 'converting'
        });
        break;
      case 'DOCUMENT_INDEXING':
        this.notificationService.showProgress({
          id: notificationId,
          title: displayName,
          message: 'AI indexing...',
          progressStatus: 'indexing'
        });
        break;
      case 'DOCUMENT_READY':
        this.notificationService.completeProgress(notificationId, 'Ready!');
        // Reload documents to show the new one
        this.loadDocuments();
        break;
      case 'DOCUMENT_ERROR':
        this.notificationService.updateProgress(notificationId, {
          type: 'error',
          message: event.message || 'Error occurred',
          progressStatus: 'error'
        });
        // Auto-dismiss after delay
        setTimeout(() => this.notificationService.dismiss(notificationId), 5000);
        break;
      case 'DOCUMENT_DELETED':
        this.loadDocuments();
        break;
    }
  }

  /**
   * Handle incoming chat WebSocket events
   */
  private handleChatEvent(event: WebSocketEvent) {
    if (event.type === 'CHAT_MESSAGE' && event.payload) {
      const message = event.payload as ChatMessage;
      // Add message if not already present (avoid duplicates from own messages)
      const exists = this.chatMessages().some(m => m.id === message.id);
      if (!exists) {
        this.chatMessages.update(msgs => [...msgs, message]);
        setTimeout(() => this.scrollChatToBottom(), 100);
      }
    }
  }

  userInitials(): string {
    const user = this.auth.user();
    if (!user) return '?';
    const first = user.firstName?.charAt(0) || user.email?.charAt(0) || '?';
    const last = user.lastName?.charAt(0) || '';
    return (first + last).toUpperCase();
  }

  isOwner(): boolean {
    const user = this.auth.user();
    const currentSpace = this.space();
    if (!user || !currentSpace) return false;
    return user.id === currentSpace.ownerUserId;
  }

  async loadSpace() {
    try {
      const space = await this.spaceService.getSpaceById(this.spaceId);
      this.space.set(space);
    } catch (err) {
      console.error('Failed to load space', err);
    }
  }

  async loadDocuments() {
    try {
      const docs = await this.documentService.getDocuments(this.spaceId);
      this.ngZone.run(() => {
        this.documents.set(docs);
        this.loadingDocuments.set(false);
      });

      const hasProcessing = docs.some(d => !d.indexed);
      if (hasProcessing) {
        this.startPolling();
      } else {
        this.stopPolling();
      }
    } catch (err) {
      console.error('Failed to load documents', err);
      this.loadingDocuments.set(false);
    }
  }

  private startPolling() {
    if (this.pollingInterval) return;

    this.ngZone.runOutsideAngular(() => {
      this.pollingInterval = setInterval(() => {
        this.loadDocuments();
      }, this.POLL_INTERVAL_MS);
    });
  }

  private stopPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }

  async uploadFile(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    // Create notification ID matching the WebSocket event handler logic
    const baseName = file.name.replace(/\.(pdf|docx|pptx|txt|doc|ppt)$/i, '');
    const notificationId = `upload-${baseName}`;
    const displayName = file.name.length > 30 ? file.name.substring(0, 27) + '...' : file.name;

    // Show upload notification immediately
    this.notificationService.showProgress({
      id: notificationId,
      title: displayName,
      message: 'Uploading...',
      progressStatus: 'uploading'
    });

    try {
      await this.documentService.uploadDocument(this.spaceId, file);
      // Status updates will come via WebSocket
    } catch (err) {
      console.error('Failed to upload document', err);
      // Update to error state
      this.notificationService.updateProgress(notificationId, {
        type: 'error',
        message: 'Upload failed',
        progressStatus: 'error'
      });
      // Auto-dismiss after delay
      setTimeout(() => this.notificationService.dismiss(notificationId), 5000);
    }

    input.value = '';
  }

  async deleteDocument(documentId: string) {
    if (!confirm('Delete this document?')) return;

    try {
      await this.documentService.deleteDocument(documentId);
      await this.loadDocuments();
    } catch (err) {
      console.error('Failed to delete document', err);
    }
  }

  async downloadDocument(doc: Document) {
    try {
      const blob = await this.documentService.downloadDocument(doc.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.originalFilename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to download document', err);
    }
  }

  async search() {
    if (!this.searchQuery.trim()) {
      console.warn('Search query is empty.');
      return;
    }

    if (this.selectedDocumentIds.length === 0) {
      console.warn('No documents selected. Searching all documents.');
    }

    this.searching.set(true);
    this.currentPage.set(1); // Reset to first page on new search
    try {
      const results = await this.searchService.search(
        this.spaceId,
        this.searchQuery,
        this.selectedDocumentIds,
        this.topK(),               // Number of results from settings
        this.topKImages(),         // Number of image results
        this.includeImagesInQuery(),  // Include images in multimodal query
        this.useReranker()         // Use cross-encoder reranking
      );

      this.ngZone.run(() => {
        this.searchResults.set(results);
      });
    } catch (err) {
      console.error('Search failed', err);
    } finally {
      this.searching.set(false);
    }
  }

  // Pagination computed values and methods

  /**
   * Get results filtered by current resultsFilter setting.
   */
  filteredResults(): PassageResult[] {
    const filter = this.resultsFilter();
    const all = this.searchResults();

    if (filter === 'all') return all;
    if (filter === 'text') return all.filter(r => r.contentType !== 'image');
    if (filter === 'image') return all.filter(r => r.contentType === 'image' || r.contentType === 'mixed');
    return all;
  }

  totalPages(): number {
    return Math.ceil(this.filteredResults().length / this.resultsPerPage);
  }

  paginatedResults(): PassageResult[] {
    const start = (this.currentPage() - 1) * this.resultsPerPage;
    const end = start + this.resultsPerPage;
    return this.filteredResults().slice(start, end);
  }


  paginatedResultsStart(): number {
    return (this.currentPage() - 1) * this.resultsPerPage + 1;
  }

  paginatedResultsEnd(): number {
    return Math.min(this.currentPage() * this.resultsPerPage, this.searchResults().length);
  }

  visiblePages(): (string | number)[] {
    const total = this.totalPages();
    const current = this.currentPage();
    const pages: (string | number)[] = [];

    if (total <= 7) {
      for (let i = 1; i <= total; i++) pages.push(i);
    } else {
      pages.push(1);
      if (current > 3) pages.push('...');

      const start = Math.max(2, current - 1);
      const end = Math.min(total - 1, current + 1);

      for (let i = start; i <= end; i++) pages.push(i);

      if (current < total - 2) pages.push('...');
      pages.push(total);
    }
    return pages;
  }

  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
    }
  }

  previousPage() {
    if (this.currentPage() > 1) {
      this.currentPage.set(this.currentPage() - 1);
    }
  }

  nextPage() {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.set(this.currentPage() + 1);
    }
  }


  toggleDocumentSelection(docId: string) {
    const index = this.selectedDocumentIds.indexOf(docId);
    if (index > -1) {
      this.selectedDocumentIds.splice(index, 1);
    } else {
      this.selectedDocumentIds.push(docId);
    }
  }


  openDocumentViewer(result: PassageResult) {
    const doc = this.documents().find(d => d.id === result.documentId);
    if (doc) {
      this.viewerDocument.set(doc);
      this.viewerPage.set(result.page);

      // Set the clicked chunk to highlight
      this.highlightChunkId.set(result.chunkId || null);

      // Pass ALL search results as AI suggestions for purple highlighting
      const suggestions: AiSuggestion[] = this.searchResults().map(r => ({
        chunkId: r.chunkId || '',
        score: r.score
      })).filter(s => s.chunkId);
      this.currentAiSuggestions.set(suggestions);

      // Auto-switch to study mode when opening from AI search
      this.autoStudyMode.set(true);
      this.viewerOpen.set(true);
    }
  }

  openDocumentViewerByDoc(doc: Document) {
    this.viewerDocument.set(doc);
    this.viewerPage.set(1);
    this.highlightChunkId.set(null);
    this.currentAiSuggestions.set([]);
    this.autoStudyMode.set(false);  // Open in native mode for regular doc viewing
    this.viewerOpen.set(true);
  }

  closeViewer() {
    this.viewerOpen.set(false);
    this.viewerDocument.set(null);
    this.viewerPage.set(null);
    this.highlightChunkId.set(null);
    this.currentAiSuggestions.set([]);
    this.autoStudyMode.set(false);
  }

  onAddComment(anchor: ChunkAnchor) {
    // TODO: Implement comment creation modal
    console.log('Add comment on chunk:', anchor);
    alert(`Comment anchor: Chunk ${anchor.chunkId}, Page ${anchor.pageNumber}, Text: "${anchor.text.substring(0, 50)}..."`);
  }

  // Image lightbox methods
  expandImage(result: PassageResult, event: Event) {
    event.stopPropagation();  // Don't trigger the card click
    this.expandedImage.set(result);
  }

  closeExpandedImage() {
    this.expandedImage.set(null);
  }

  openDocumentViewerFromImage() {
    const image = this.expandedImage();
    if (image) {
      this.closeExpandedImage();
      this.openDocumentViewer(image);
    }
  }

  logout() {

    this.auth.logout();
  }

  // Chat methods
  currentUserId(): string {
    return this.auth.user()?.id || '';
  }

  toggleChat() {
    this.chatOpen.update(v => !v);
    if (this.chatOpen()) {
      this.loadChatMessages();
      // Chat now uses WebSocket - no need for polling!
    }
  }

  async loadChatMessages() {
    try {
      const messages = await this.chatService.getMessages(this.spaceId).toPromise();
      this.ngZone.run(() => {
        this.chatMessages.set(messages || []);
        setTimeout(() => this.scrollChatToBottom(), 100);
      });
    } catch (err) {
      console.error('Failed to load chat messages', err);
    }
  }

  async sendChatMessage() {
    if (!this.chatInput.trim()) return;

    const content = this.chatInput.trim();
    this.chatInput = '';

    try {
      // Send message - WebSocket will broadcast it back to all clients including us
      await this.chatService.sendMessage(this.spaceId, content).toPromise();
      setTimeout(() => this.scrollChatToBottom(), 100);
    } catch (err) {
      console.error('Failed to send message', err);
      this.chatInput = content; // Restore input on error
    }
  }

  // Chat polling removed - now using WebSocket for real-time updates

  private scrollChatToBottom() {
    if (this.chatContainer?.nativeElement) {
      const el = this.chatContainer.nativeElement;
      el.scrollTop = el.scrollHeight;
    }
  }

  getInitials(name: string): string {
    if (!name) return '?';
    const parts = name.split(' ');
    return (parts[0]?.charAt(0) || '') + (parts[1]?.charAt(0) || '');
  }

  formatTime(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    if (isToday) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' +
      date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  // Chunk Size Settings
  toggleChunkSettings(docId: string) {
    if (this.chunkSettingsOpen() === docId) {
      this.chunkSettingsOpen.set(null);
    } else {
      this.chunkSettingsOpen.set(docId);
      // Pre-fill custom input with current value
      const doc = this.documents().find(d => d.id === docId);
      if (doc) {
        this.customChunkTokens = doc.chunkTokens || 400;
      }
    }
  }

  async updateChunkSize(doc: Document, newSize: number) {
    if (doc.chunkTokens === newSize) {
      this.chunkSettingsOpen.set(null);
      return;
    }

    // Confirm with user
    const confirmed = confirm(
      `Are you sure you want to change chunk size from ${doc.chunkTokens || 400} to ${newSize} tokens?\n\n` +
      `⚠️ This will:\n` +
      `• Re-index the document\n` +
      `• Delete all existing comments\n\n` +
      `The document will be temporarily unavailable while re-indexing.`
    );

    if (!confirmed) return;

    try {
      const updated = await this.documentService.updateDocumentSettings(doc.id, newSize);

      // Update local state
      this.documents.update(docs =>
        docs.map(d => d.id === doc.id ? updated : d)
      );

      this.chunkSettingsOpen.set(null);

      // Start polling to check when indexing completes
      this.startPolling();
    } catch (err) {
      console.error('Failed to update chunk size', err);
      alert('Failed to update chunk size. Please try again.');
    }
  }

  async applyCustomChunkSize(doc: Document) {
    // Validate range
    const size = Math.max(100, Math.min(1000, this.customChunkTokens));
    await this.updateChunkSize(doc, size);
  }
}

