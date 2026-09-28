import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ChatMessage {
    id: string;
    spaceId: string;
    authorUserId: string;
    authorName: string;
    content: string;
    createdAt: string;
}

@Injectable({
    providedIn: 'root'
})
export class ChatService {
    constructor(private http: HttpClient) { }

    getMessages(spaceId: string): Observable<ChatMessage[]> {
        return this.http.get<ChatMessage[]>(`/api/spaces/${spaceId}/chat`);
    }

    sendMessage(spaceId: string, content: string): Observable<ChatMessage> {
        return this.http.post<ChatMessage>(`/api/spaces/${spaceId}/chat`, { content });
    }
}
