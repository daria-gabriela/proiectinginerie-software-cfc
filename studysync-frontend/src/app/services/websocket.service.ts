import { Injectable, NgZone, signal } from '@angular/core';
import { Client, IMessage, StompSubscription } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

/**
 * WebSocket event types matching backend WebSocketEvent.EventType
 */
export type WebSocketEventType =
    | 'DOCUMENT_UPLOADING'
    | 'DOCUMENT_CONVERTING'
    | 'DOCUMENT_INDEXING'
    | 'DOCUMENT_READY'
    | 'DOCUMENT_ERROR'
    | 'DOCUMENT_DELETED'
    | 'CHAT_MESSAGE'
    | 'COMMENT_ADDED'
    | 'COMMENT_UPDATED'
    | 'COMMENT_DELETED'
    | 'MEMBER_JOINED'
    | 'MEMBER_LEFT';

/**
 * WebSocket event structure matching backend WebSocketEvent
 */
export interface WebSocketEvent {
    type: WebSocketEventType;
    spaceId: string;
    documentId?: string;
    userId?: string;
    message?: string;
    payload?: any;
    timestamp: string;
}

/**
 * Subscription callback type
 */
export type WebSocketCallback = (event: WebSocketEvent) => void;

/**
 * WebSocket service for real-time updates.
 * Uses STOMP over SockJS for browser compatibility.
 * 
 * Usage:
 *   // Subscribe to document events for a space
 *   const unsubscribe = webSocketService.subscribeToDocuments(spaceId, (event) => {
 *     console.log('Document event:', event.type, event.message);
 *   });
 *   
 *   // Later, unsubscribe
 *   unsubscribe();
 */
@Injectable({ providedIn: 'root' })
export class WebSocketService {
    private client: Client | null = null;
    private subscriptions = new Map<string, StompSubscription>();
    private pendingSubscriptions: Array<{ destination: string; callback: WebSocketCallback }> = [];

    // Connection state
    connected = signal(false);
    connecting = signal(false);

    // Current document processing status (for upload modal)
    processingStatus = signal<WebSocketEvent | null>(null);

    constructor(private ngZone: NgZone) { }

    /**
     * Connect to WebSocket server
     */
    connect(): void {
        if (this.client?.connected || this.connecting()) {
            return;
        }

        this.connecting.set(true);

        this.client = new Client({
            // Connect to Spring Boot backend (port 8080)
            webSocketFactory: () => new SockJS('/ws'),
            reconnectDelay: 5000,
            heartbeatIncoming: 4000,
            heartbeatOutgoing: 4000,
            debug: (msg) => {
                // Uncomment for debugging
                // console.log('[STOMP]', msg);
            },
            onConnect: () => {
                this.ngZone.run(() => {
                    this.connected.set(true);
                    this.connecting.set(false);
                    console.log('[WebSocket] Connected');

                    // Process pending subscriptions
                    this.pendingSubscriptions.forEach(({ destination, callback }) => {
                        this.subscribe(destination, callback);
                    });
                    this.pendingSubscriptions = [];
                });
            },
            onDisconnect: () => {
                this.ngZone.run(() => {
                    this.connected.set(false);
                    console.log('[WebSocket] Disconnected');
                });
            },
            onStompError: (frame) => {
                this.ngZone.run(() => {
                    this.connecting.set(false);
                    console.error('[WebSocket] STOMP error:', frame.headers['message']);
                });
            }
        });

        this.client.activate();
    }

    /**
     * Disconnect from WebSocket server
     */
    disconnect(): void {
        if (this.client) {
            this.client.deactivate();
            this.client = null;
            this.subscriptions.clear();
            this.connected.set(false);
        }
    }

    /**
     * Subscribe to document events for a specific space
     */
    subscribeToDocuments(spaceId: string, callback: WebSocketCallback): () => void {
        const destination = `/topic/space/${spaceId}/documents`;
        return this.subscribeWithAutoConnect(destination, (event) => {
            // Update processing status signal
            this.processingStatus.set(event);
            callback(event);
        });
    }

    /**
     * Subscribe to chat messages for a specific space
     */
    subscribeToChat(spaceId: string, callback: WebSocketCallback): () => void {
        const destination = `/topic/space/${spaceId}/chat`;
        return this.subscribeWithAutoConnect(destination, callback);
    }

    /**
     * Subscribe to comment events for a specific space
     */
    subscribeToComments(spaceId: string, callback: WebSocketCallback): () => void {
        const destination = `/topic/space/${spaceId}/comments`;
        return this.subscribeWithAutoConnect(destination, callback);
    }

    /**
     * Clear the processing status (after dismissing modal)
     */
    clearProcessingStatus(): void {
        this.processingStatus.set(null);
    }

    /**
     * Internal: Subscribe with auto-connect
     */
    private subscribeWithAutoConnect(destination: string, callback: WebSocketCallback): () => void {
        if (!this.connected()) {
            // Queue subscription and connect
            this.pendingSubscriptions.push({ destination, callback });
            this.connect();

            return () => {
                // Remove from pending if not yet subscribed
                this.pendingSubscriptions = this.pendingSubscriptions.filter(
                    p => p.destination !== destination
                );
                this.unsubscribe(destination);
            };
        }

        this.subscribe(destination, callback);
        return () => this.unsubscribe(destination);
    }

    /**
     * Internal: Subscribe to a destination
     */
    private subscribe(destination: string, callback: WebSocketCallback): void {
        if (!this.client?.connected) {
            console.warn('[WebSocket] Cannot subscribe - not connected');
            return;
        }

        // Avoid duplicate subscriptions
        if (this.subscriptions.has(destination)) {
            return;
        }

        const subscription = this.client.subscribe(destination, (message: IMessage) => {
            this.ngZone.run(() => {
                try {
                    const event: WebSocketEvent = JSON.parse(message.body);
                    callback(event);
                } catch (e) {
                    console.error('[WebSocket] Failed to parse message:', e);
                }
            });
        });

        this.subscriptions.set(destination, subscription);
        console.log('[WebSocket] Subscribed to', destination);
    }

    /**
     * Internal: Unsubscribe from a destination
     */
    private unsubscribe(destination: string): void {
        const subscription = this.subscriptions.get(destination);
        if (subscription) {
            subscription.unsubscribe();
            this.subscriptions.delete(destination);
            console.log('[WebSocket] Unsubscribed from', destination);
        }
    }
}
