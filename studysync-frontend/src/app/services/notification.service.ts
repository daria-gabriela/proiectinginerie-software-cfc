import { Injectable, signal, computed } from '@angular/core';

export type NotificationType = 'info' | 'success' | 'warning' | 'error' | 'progress';

export interface Notification {
    id: string;
    type: NotificationType;
    title: string;
    message: string;
    progress?: number; // 0-100 for progress type
    progressStatus?: 'uploading' | 'converting' | 'indexing' | 'ready' | 'error';
    autoClose?: boolean;
    duration?: number; // ms
    createdAt: Date;
    onClick?: () => void;  // Callback when notification is clicked
    clickable?: boolean;   // Show cursor pointer and hover effect
}

@Injectable({
    providedIn: 'root'
})
export class NotificationService {
    private notifications = signal<Notification[]>([]);

    // Public readonly signal
    readonly activeNotifications = computed(() => this.notifications());

    /**
     * Show a notification
     */
    show(options: {
        type: NotificationType;
        title: string;
        message: string;
        autoClose?: boolean;
        duration?: number;
        id?: string;
        onClick?: () => void;
        clickable?: boolean;
    }): string {
        const id = options.id || this.generateId();

        const notification: Notification = {
            id,
            type: options.type,
            title: options.title,
            message: options.message,
            autoClose: options.autoClose ?? (options.type !== 'progress'),
            duration: options.duration ?? 5000,
            createdAt: new Date(),
            onClick: options.onClick,
            clickable: options.clickable ?? !!options.onClick
        };

        this.notifications.update(list => {
            // If notification with this ID exists, update it
            const existingIndex = list.findIndex(n => n.id === id);
            if (existingIndex >= 0) {
                const updated = [...list];
                updated[existingIndex] = notification;
                return updated;
            }
            // Otherwise add new
            return [...list, notification];
        });

        // Auto-close if enabled
        if (notification.autoClose) {
            setTimeout(() => this.dismiss(id), notification.duration);
        }

        return id;
    }

    /**
     * Show a progress notification (for uploads, processing, etc.)
     */
    showProgress(options: {
        id: string;
        title: string;
        message: string;
        progress?: number;
        progressStatus?: 'uploading' | 'converting' | 'indexing' | 'ready' | 'error';
    }): void {
        const notification: Notification = {
            id: options.id,
            type: 'progress',
            title: options.title,
            message: options.message,
            progress: options.progress ?? 0,
            progressStatus: options.progressStatus ?? 'uploading',
            autoClose: false,
            createdAt: new Date()
        };

        this.notifications.update(list => {
            const existingIndex = list.findIndex(n => n.id === options.id);
            if (existingIndex >= 0) {
                const updated = [...list];
                updated[existingIndex] = notification;
                return updated;
            }
            return [...list, notification];
        });
    }

    /**
     * Update progress notification
     */
    updateProgress(id: string, updates: Partial<Notification>): void {
        this.notifications.update(list => {
            const index = list.findIndex(n => n.id === id);
            if (index >= 0) {
                const updated = [...list];
                updated[index] = { ...updated[index], ...updates };
                return updated;
            }
            return list;
        });
    }

    /**
     * Complete a progress notification (show success briefly then dismiss)
     */
    completeProgress(id: string, message?: string): void {
        this.updateProgress(id, {
            type: 'success',
            message: message || 'Complete!',
            progressStatus: 'ready',
            progress: 100
        });

        // Auto-dismiss after delay
        setTimeout(() => this.dismiss(id), 2000);
    }

    /**
     * Show success notification
     */
    success(title: string, message: string, duration = 4000): string {
        return this.show({ type: 'success', title, message, autoClose: true, duration });
    }

    /**
     * Show error notification
     */
    error(title: string, message: string, duration = 6000): string {
        return this.show({ type: 'error', title, message, autoClose: true, duration });
    }

    /**
     * Show info notification
     */
    info(title: string, message: string, duration = 5000): string {
        return this.show({ type: 'info', title, message, autoClose: true, duration });
    }

    /**
     * Show warning notification
     */
    warning(title: string, message: string, duration = 5000): string {
        return this.show({ type: 'warning', title, message, autoClose: true, duration });
    }

    /**
     * Dismiss a notification
     */
    dismiss(id: string): void {
        this.notifications.update(list => list.filter(n => n.id !== id));
    }

    /**
     * Dismiss all notifications
     */
    dismissAll(): void {
        this.notifications.set([]);
    }

    private generateId(): string {
        return `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
}
