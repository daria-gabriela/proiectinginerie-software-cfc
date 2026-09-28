import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationService, Notification } from '../../services/notification.service';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  template: `
    <div class="fixed bottom-4 right-4 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none">
      @for (notification of notifications(); track notification.id) {
        <div 
          class="pointer-events-auto bg-white dark:bg-gray-800 rounded-xl shadow-2xl border overflow-hidden transform transition-all duration-300 ease-out animate-slide-in"
          [ngClass]="{
            'border-blue-200 dark:border-blue-700': notification.type === 'info' || notification.type === 'progress',
            'border-green-200 dark:border-green-700': notification.type === 'success',
            'border-yellow-200 dark:border-yellow-700': notification.type === 'warning',
            'border-red-200 dark:border-red-700': notification.type === 'error',
            'cursor-pointer hover:scale-[1.02] hover:shadow-xl': notification.clickable
          }"
          (click)="handleClick(notification, $event)"
        >
          <div class="p-4">
            <div class="flex items-start gap-3">
              <!-- Icon -->
              <div 
                class="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center"
                [ngClass]="{
                  'bg-blue-100 dark:bg-blue-900': notification.type === 'info' || (notification.type === 'progress' && notification.progressStatus === 'uploading'),
                  'bg-green-100 dark:bg-green-900': notification.type === 'success',
                  'bg-yellow-100 dark:bg-yellow-900': notification.type === 'warning',
                  'bg-red-100 dark:bg-red-900': notification.type === 'error',
                  'bg-purple-100 dark:bg-purple-900': notification.type === 'progress' && notification.progressStatus === 'converting',
                  'bg-amber-100 dark:bg-amber-900': notification.type === 'progress' && notification.progressStatus === 'indexing'
                }"
              >
                @switch (notification.type) {
                  @case ('info') {
                    <lucide-icon name="info" class="w-4 h-4 text-blue-600 dark:text-blue-400"></lucide-icon>
                  }
                  @case ('success') {
                    <lucide-icon name="check-circle" class="w-4 h-4 text-green-600 dark:text-green-400"></lucide-icon>
                  }
                  @case ('warning') {
                    <lucide-icon name="alert-triangle" class="w-4 h-4 text-yellow-600 dark:text-yellow-400"></lucide-icon>
                  }
                  @case ('error') {
                    <lucide-icon name="alert-circle" class="w-4 h-4 text-red-600 dark:text-red-400"></lucide-icon>
                  }
                  @case ('progress') {
                    @switch (notification.progressStatus) {
                      @case ('uploading') {
                        <lucide-icon name="upload" class="w-4 h-4 text-blue-600 dark:text-blue-400 animate-pulse"></lucide-icon>
                      }
                      @case ('converting') {
                        <lucide-icon name="file-type" class="w-4 h-4 text-purple-600 dark:text-purple-400 animate-pulse"></lucide-icon>
                      }
                      @case ('indexing') {
                        <lucide-icon name="brain" class="w-4 h-4 text-amber-600 dark:text-amber-400 animate-pulse"></lucide-icon>
                      }
                      @case ('ready') {
                        <lucide-icon name="check-circle" class="w-4 h-4 text-green-600 dark:text-green-400"></lucide-icon>
                      }
                      @case ('error') {
                        <lucide-icon name="alert-circle" class="w-4 h-4 text-red-600 dark:text-red-400"></lucide-icon>
                      }
                      @default {
                        <lucide-icon name="loader-2" class="w-4 h-4 text-blue-600 dark:text-blue-400 animate-spin"></lucide-icon>
                      }
                    }
                  }
                }
              </div>
              
              <!-- Content -->
              <div class="flex-1 min-w-0">
                <p class="text-sm font-semibold text-gray-900 dark:text-white truncate">
                  {{ notification.title }}
                </p>
                <p class="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                  {{ notification.message }}
                </p>
                @if (notification.clickable) {
                  <p class="text-xs text-blue-500 dark:text-blue-400 mt-1 font-medium">
                    Click to view →
                  </p>
                }
              </div>
              
              <!-- Close button -->
              <button 
                (click)="dismiss(notification.id)"
                class="flex-shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition"
              >
                <lucide-icon name="x" class="w-4 h-4"></lucide-icon>
              </button>
            </div>
          </div>
          
          <!-- Progress bar for progress type -->
          @if (notification.type === 'progress' && notification.progressStatus !== 'ready') {
            <div class="h-1 bg-gray-100 dark:bg-gray-700">
              <div 
                class="h-full transition-all duration-500 ease-out"
                [ngClass]="{
                  'bg-blue-500': notification.progressStatus === 'uploading',
                  'bg-purple-500': notification.progressStatus === 'converting',
                  'bg-amber-500': notification.progressStatus === 'indexing'
                }"
                [style.width.%]="getProgressWidth(notification)"
              ></div>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    @keyframes slide-in {
      from {
        opacity: 0;
        transform: translateX(100%);
      }
      to {
        opacity: 1;
        transform: translateX(0);
      }
    }
    
    .animate-slide-in {
      animation: slide-in 0.3s ease-out;
    }
  `]
})
export class ToastContainerComponent {
  private notificationService = inject(NotificationService);

  notifications = this.notificationService.activeNotifications;

  dismiss(id: string) {
    this.notificationService.dismiss(id);
  }

  handleClick(notification: Notification, event: Event) {
    // If clicked on close button, don't trigger the action
    const target = event.target as HTMLElement;
    if (target.closest('button')) {
      return;
    }
    
    if (notification.clickable && notification.onClick) {
      notification.onClick();
      this.dismiss(notification.id);
    }
  }

  getProgressWidth(notification: Notification): number {
    if (notification.progress !== undefined) {
      return notification.progress;
    }
    // Default progress based on status
    switch (notification.progressStatus) {
      case 'uploading': return 25;
      case 'converting': return 50;
      case 'indexing': return 75;
      case 'ready': return 100;
      default: return 0;
    }
  }
}
