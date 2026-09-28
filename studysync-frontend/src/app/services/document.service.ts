import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

export interface Document {
  id: string;
  spaceId: string;
  originalFilename: string;
  contentType: string;
  fileSize: number;
  indexed: boolean;
  chunkCount: number;
  chunkTokens: number;  // Max tokens per chunk (100-1000)
  createdAt: string;
  uploadedByUserName: string;
}

// Preset chunk sizes for UI
export const CHUNK_SIZE_PRESETS = [
  { label: 'Fine-grained (200 tokens)', value: 200, description: 'Sentence-level chunks' },
  { label: 'Standard (400 tokens)', value: 400, description: 'Paragraph-level chunks' },
  { label: 'Coarse (800 tokens)', value: 800, description: 'Section-level chunks' },
];

@Injectable({ providedIn: 'root' })
export class DocumentService {
  constructor(private http: HttpClient) {}
  
  getDocuments(spaceId: string): Promise<Document[]> {
    return firstValueFrom(this.http.get<Document[]>(`/api/spaces/${spaceId}/documents`));
  }
  
  uploadDocument(spaceId: string, file: File): Promise<Document> {
    const formData = new FormData();
    formData.append('file', file);
    return firstValueFrom(this.http.post<Document>(`/api/spaces/${spaceId}/documents`, formData));
  }
  
  downloadDocument(documentId: string): Promise<Blob> {
    return firstValueFrom(
      this.http.get(`/api/documents/${documentId}/download`, { responseType: 'blob' })
    );
  }
  
  deleteDocument(documentId: string): Promise<void> {
    return firstValueFrom(this.http.delete<void>(`/api/documents/${documentId}`));
  }

  /**
   * Update document settings (chunk tokens).
   * Warning: This triggers re-indexing and invalidates existing comments.
   */
  updateDocumentSettings(documentId: string, chunkTokens: number): Promise<Document> {
    return firstValueFrom(
      this.http.patch<Document>(`/api/documents/${documentId}/settings`, { chunkTokens })
    );
  }
}
