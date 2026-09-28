import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

export interface PageRender {
  image: string;  // base64 data URL
  width: number;
  height: number;
  originalWidth: number;
  originalHeight: number;
  pageNumber: number;
  totalPages: number;
}

@Injectable({ providedIn: 'root' })
export class LayoutService {
  constructor(private http: HttpClient) {}
  
  renderPage(documentId: string, pageNumber: number, scale: number = 2.0): Promise<PageRender> {
    return firstValueFrom(
      this.http.get<PageRender>(`/api/documents/${documentId}/render/${pageNumber}`, {
        params: { scale: scale.toString() }
      })
    );
  }
}

