import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

/**
 * Content type for search results.
 * - text: Text-only chunk
 * - image: Image-only chunk (extracted figure/diagram)
 * - mixed: Text with associated image
 */
export type ContentType = 'text' | 'image' | 'mixed';

export interface PassageResult {
  // Core identification
  chunkId?: string;
  documentId: string;
  documentFilename?: string;  // Source attribution - original filename
  page: number;
  score: number;

  // Content type for determining display mode
  contentType?: ContentType;

  // Text content (for text and mixed chunks)
  text?: string;

  // Image content (for image and mixed chunks)
  imagePath?: string;         // Relative path to image file
  imageUrl?: string;          // Full URL to serve image (from ML server)
  thumbnail?: string;         // Base64 encoded thumbnail for preview
  imageWidth?: number;
  imageHeight?: number;

  // Visual bounds for Study Mode highlighting
  bounds?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

/**
 * Helper to check if a passage has image content.
 */
export function hasImage(result: PassageResult): boolean {
  return result.contentType === 'image' || result.contentType === 'mixed';
}

/**
 * Helper to check if a passage has text content.
 */
export function hasText(result: PassageResult): boolean {
  return result.contentType === 'text' || result.contentType === 'mixed' || !!result.text;
}

@Injectable({ providedIn: 'root' })
export class SearchService {
  constructor(private http: HttpClient) { }

  /**
   * Search for relevant passages in a space.
   * @param spaceId - Space to search in
   * @param query - Search query text
   * @param documentIds - Optional list of document IDs to search within
   * @param topK - Number of results to return
   * @param includeImages - Whether to include image chunks in search (requires multimodal model)
   * @param useReranker - Whether to use cross-encoder reranking for better accuracy
   */
  search(
    spaceId: string,
    query: string,
    documentIds: string[] = [],
    topK: number = 10,
    topKImages: number = 5,
    includeImages: boolean = true,
    useReranker: boolean = true
  ): Promise<PassageResult[]> {
    return firstValueFrom(
      this.http.post<PassageResult[]>(`/api/spaces/${spaceId}/search`, {
        query,
        topK,
        topKImages,
        documentIds,
        includeImages,
        useReranker
      })
    );
  }
}