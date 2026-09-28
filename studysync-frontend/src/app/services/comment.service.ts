import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

// =====================
// Chunk-Centric Models
// =====================

export interface ChunkBounds {
  x: number;      // % of page width (0-1)
  y: number;      // % of page height (0-1)
  width: number;  // % of page width
  height: number; // % of page height
}

export interface Chunk {
  id: string;
  text?: string;  // Optional for image-only chunks
  documentId: string;
  page: number;
  bounds: ChunkBounds;

  // Multimodal fields
  contentType?: 'text' | 'image' | 'mixed';
  imagePath?: string;
  imageUrl?: string;
  thumbnail?: string;  // Base64 thumbnail
  imageWidth?: number;
  imageHeight?: number;
}

/**
 * Helper to check if a chunk is an image chunk.
 */
export function isImageChunk(chunk: Chunk): boolean {
  return chunk.contentType === 'image' || chunk.contentType === 'mixed';
}


export interface PageChunks {
  pageNumber: number;
  width: number;
  height: number;
  chunks: Chunk[];
}

export interface DocumentChunks {
  documentId: string;
  fileName: string;
  fileType: string;
  pageCount: number;
  pages: PageChunks[];
}

// =====================
// Comment Models
// =====================

export interface Comment {
  id: string;
  documentId: string;
  passageId?: string;
  chunkId: string;        // Primary anchor - the chunk this comment is on
  pageNumber?: number;
  selectedText?: string;
  authorUserId: string;
  authorName: string;
  content: string;
  mentions: string[];
  createdAt: string;

  /** @deprecated Use chunkId instead */
  elementIndex?: number;
}

export interface CreateCommentDTO {
  documentId?: string;
  passageId?: string;
  chunkId: string;        // Primary anchor
  pageNumber?: number;
  selectedText?: string;
  content: string;

  /** @deprecated Use chunkId instead */
  elementIndex?: number;
}

@Injectable({
  providedIn: 'root'
})
export class CommentService {
  constructor(private http: HttpClient) { }

  // =====================
  // Comment Operations
  // =====================

  getCommentsForSpace(spaceId: string): Observable<Comment[]> {
    return this.http.get<Comment[]>(`/api/spaces/${spaceId}/comments`);
  }

  getCommentsForDocument(spaceId: string, documentId: string): Observable<Comment[]> {
    return this.http.get<Comment[]>(`/api/spaces/${spaceId}/documents/${documentId}/comments`);
  }

  createComment(spaceId: string, dto: CreateCommentDTO): Observable<Comment> {
    return this.http.post<Comment>(`/api/spaces/${spaceId}/comments`, dto);
  }

  updateComment(commentId: string, content: string): Observable<Comment> {
    return this.http.put<Comment>(`/api/comments/${commentId}`, { content });
  }

  deleteComment(commentId: string): Observable<void> {
    return this.http.delete<void>(`/api/comments/${commentId}`);
  }

  // =====================
  // Chunk Operations
  // =====================

  /**
   * Get all chunks for a document with visual bounds.
   * This is the primary API for Study Mode.
   */
  getDocumentChunks(documentId: string): Observable<DocumentChunks> {
    return this.http.get<DocumentChunks>(`/api/documents/${documentId}/chunks`);
  }

  /**
   * Get comments for a specific chunk.
   */
  getCommentsForChunk(allComments: Comment[], chunkId: string): Comment[] {
    return allComments.filter(c => c.chunkId === chunkId);
  }
}
