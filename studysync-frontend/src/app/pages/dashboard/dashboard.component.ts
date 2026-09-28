import { Component, OnInit, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { SpaceService, StudySpace } from '../../services/space.service';
import { CalendarService, CalendarEvent } from '../../services/calendar.service';
import { AuthService } from '../../core/auth.service';
import { ThemeService } from '../../core/theme.service';
import { LucideAngularModule } from 'lucide-angular';
import { MatDatepickerModule, MatCalendar } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, LucideAngularModule, MatDatepickerModule, MatNativeDateModule, MatCardModule],
  template: `
    <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
      <!-- Header -->
      <header class="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div class="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 bg-gradient-to-br from-primary-600 to-accent-600 rounded-xl flex items-center justify-center">
              <lucide-icon name="book-open" class="w-6 h-6 text-white"></lucide-icon>
            </div>
            <h1 class="text-xl font-bold text-gray-900 dark:text-white">StudySync AI</h1>
          </div>
          
          <div class="flex items-center gap-4">
            <button 
              (click)="showCreateModal = true"
              class="bg-primary-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-primary-700 transition flex items-center gap-2"
            >
              <lucide-icon name="plus" class="w-5 h-5"></lucide-icon>
              New Space
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
                <div class="w-9 h-9 bg-primary-100 dark:bg-primary-900 text-primary-600 dark:text-primary-400 rounded-full flex items-center justify-center font-semibold">
                  {{ userInitials() }}
                </div>
                <lucide-icon name="chevron-down" class="w-4 h-4 text-gray-500 dark:text-gray-400"></lucide-icon>
              </button>
              
              @if (showUserMenu) {
                <div class="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 py-2 z-50">
                  <div class="px-4 py-2 border-b border-gray-100 dark:border-gray-700">
                    <p class="text-sm font-medium text-gray-900 dark:text-white">{{ auth.user()?.email }}</p>
                  </div>
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
      </header>
      
      <!-- Content -->
      <main class="max-w-7xl mx-auto px-4 py-8">
        <div class="flex items-center justify-between mb-6">
          <h2 class="text-xl font-semibold text-gray-900 dark:text-white">Your Study Spaces</h2>
          <button 
            (click)="showJoinModal = true"
            class="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium flex items-center gap-2"
          >
            <lucide-icon name="user-plus" class="w-5 h-5"></lucide-icon>
            Join with invite code
          </button>
        </div>
        
        @if (loading()) {
          <div class="flex justify-center py-12">
            <lucide-icon name="loader-2" class="w-8 h-8 text-primary-600 animate-spin"></lucide-icon>
          </div>
        } @else if (spaces().length === 0) {
          <div class="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
            <lucide-icon name="archive" class="mx-auto h-12 w-12 text-gray-400"></lucide-icon>
            <h3 class="mt-4 text-lg font-medium text-gray-900 dark:text-white">No study spaces yet</h3>
            <p class="mt-2 text-gray-500 dark:text-gray-400">Create a new space or join one with an invite code.</p>
          </div>
        } @else {
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            @for (space of spaces(); track space.id) {
              <a 
                [routerLink]="['/spaces', space.id]"
                class="block bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg hover:border-primary-300 dark:hover:border-primary-600 transition group"
              >
                <div class="flex items-start justify-between">
                  <div class="w-12 h-12 bg-gradient-to-br from-primary-500 to-accent-500 rounded-lg flex items-center justify-center">
                    <lucide-icon name="book-open" class="w-6 h-6 text-white"></lucide-icon>
                  </div>
                  <span class="text-xs font-mono text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                    {{ space.inviteCode }}
                  </span>
                </div>
                <h3 class="mt-4 text-lg font-semibold text-gray-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition">
                  {{ space.name }}
                </h3>
                <p class="mt-1 text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
                  {{ space.description || 'No description' }}
                </p>
                <div class="mt-4 flex items-center text-sm text-gray-400">
                  <lucide-icon name="users" class="w-4 h-4 mr-1"></lucide-icon>
                  {{ space.members?.length || 1 }} member(s)
                </div>
              </a>
            }
          </div>
        }
        

      <!-- Calendar Section -->
      <div class="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Calendar Card -->
        <div class="lg:col-span-1 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 flex flex-col">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <lucide-icon name="calendar" class="w-5 h-5 text-primary-600 dark:text-primary-400"></lucide-icon>
              Calendar
            </h2>
            <button (click)="onDateSelected(newDate())" class="text-xs font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 hover:underline">
              Today
            </button>
          </div>
          <mat-card class="!shadow-none !bg-transparent flex-1 flex items-center justify-center">
            <mat-calendar 
              [selected]="selectedDate" 
              (selectedChange)="onDateSelected($event)"
              [dateClass]="dateClass"
            ></mat-calendar>
          </mat-card>
        </div>

        <!-- Events Agenda Card -->
        <div class="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 flex flex-col">
          <div class="flex items-center justify-between mb-6">
            <div>
              <h2 class="text-xl font-bold text-gray-900 dark:text-white">
                {{ selectedDate | date:'EEEE, MMMM d' }}
              </h2>
              <p class="text-sm text-gray-500 dark:text-gray-400">
                {{ eventsForSelectedDate().length }} event(s) scheduled
              </p>
            </div>
            <button 
              (click)="showAddEventModal = true"
              class="bg-primary-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-primary-700 transition flex items-center gap-2 shadow-sm"
            >
              <lucide-icon name="plus" class="w-4 h-4"></lucide-icon>
              Add Event
            </button>
          </div>

          <div class="flex-1 overflow-y-auto min-h-[300px]">
            @if (eventsForSelectedDate().length === 0) {
              <div class="h-full flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl">
                <div class="w-16 h-16 bg-gray-50 dark:bg-gray-900 rounded-full flex items-center justify-center mb-4">
                  <lucide-icon name="calendar" class="w-8 h-8 text-gray-400"></lucide-icon>
                </div>
                <h3 class="text-lg font-medium text-gray-900 dark:text-white">No events</h3>
                <p class="text-gray-500 dark:text-gray-400 max-w-xs mx-auto">
                  You haven't scheduled anything for this day. Click "Add Event" to get started.
                </p>
              </div>
            } @else {
              <div class="space-y-3">
                @for (event of eventsForSelectedDate(); track event.id) {
                  <div class="flex items-start gap-4 p-4 bg-gray-50 dark:bg-gray-700/50 hover:bg-white dark:hover:bg-gray-700 border border-transparent hover:border-primary-200 dark:hover:border-primary-700 rounded-xl transition group shadow-sm">
                    <div class="flex-shrink-0 w-2 h-full py-1">
                      <div class="w-1 h-full bg-primary-500 rounded-full"></div>
                    </div>
                    <div class="flex-1 min-w-0">
                      <div class="flex items-start justify-between">
                        <h3 class="text-lg font-semibold text-gray-900 dark:text-white truncate pr-4">
                          {{ event.title }}
                        </h3>
                        <button 
                          (click)="deleteEvent(event.id)"
                          class="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition p-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30"
                          title="Delete event"
                        >
                          <lucide-icon name="trash-2" class="w-4 h-4"></lucide-icon>
                        </button>
                      </div>
                      @if (event.description) {
                        <p class="mt-1 text-gray-600 dark:text-gray-300">{{ event.description }}</p>
                      }
                    </div>
                  </div>
                }
              </div>
            }
          </div>
        </div>
      </div>

      </main>
      
      <!-- Create Modal -->
      @if (showCreateModal) {
        <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" (click)="showCreateModal = false">
          <div class="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md" (click)="$event.stopPropagation()">
            <div class="flex items-center gap-3 mb-4">
              <div class="w-10 h-10 bg-primary-100 dark:bg-primary-900 rounded-lg flex items-center justify-center">
                <lucide-icon name="plus" class="w-5 h-5 text-primary-600 dark:text-primary-400"></lucide-icon>
              </div>
              <h3 class="text-xl font-semibold text-gray-900 dark:text-white">Create New Space</h3>
            </div>
            <form (ngSubmit)="createSpace()">
              <div class="mb-4">
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
                <input 
                  [(ngModel)]="newSpaceName" 
                  name="name"
                  class="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="e.g., CS 330 Study Group"
                />
              </div>
              <div class="mb-6">
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                <textarea 
                  [(ngModel)]="newSpaceDescription" 
                  name="description"
                  rows="3"
                  class="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="What's this space for?"
                ></textarea>
              </div>
              <div class="flex gap-3">
                <button type="button" (click)="showCreateModal = false" class="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-white">
                  Cancel
                </button>
                <button type="submit" class="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      }
      
      <!-- Join Modal -->
      @if (showJoinModal) {
        <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" (click)="showJoinModal = false">
          <div class="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md" (click)="$event.stopPropagation()">
            <div class="flex items-center gap-3 mb-4">
              <div class="w-10 h-10 bg-accent-100 dark:bg-accent-900 rounded-lg flex items-center justify-center">
                <lucide-icon name="user-plus" class="w-5 h-5 text-accent-600 dark:text-accent-400"></lucide-icon>
              </div>
              <h3 class="text-xl font-semibold text-gray-900 dark:text-white">Join a Space</h3>
            </div>
            <form (ngSubmit)="joinSpace()">
              <div class="mb-6">
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Invite Code</label>
                <input 
                  [(ngModel)]="inviteCode" 
                  name="inviteCode"
                  class="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 font-mono uppercase bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Enter 8-character code"
                />
              </div>
              <div class="flex gap-3">
                <button type="button" (click)="showJoinModal = false" class="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-white">
                  Cancel
                </button>
                <button type="submit" class="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
                  Join
                </button>
              </div>
            </form>
          </div>
        </div>
      }
      
      <!-- Add Event Modal -->
      @if (showAddEventModal) {
        <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" (click)="showAddEventModal = false">
          <div class="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md" (click)="$event.stopPropagation()">
            <div class="flex items-center gap-3 mb-4">
              <div class="w-10 h-10 bg-accent-100 dark:bg-accent-900 rounded-lg flex items-center justify-center">
                <lucide-icon name="calendar" class="w-5 h-5 text-accent-600 dark:text-accent-400"></lucide-icon>
              </div>
              <div>
                <h3 class="text-xl font-semibold text-gray-900 dark:text-white">Add Event</h3>
                <p class="text-sm text-gray-500 dark:text-gray-400">{{ selectedDate | date:'MMMM d, yyyy' }}</p>
              </div>
            </div>
            <form (ngSubmit)="addEvent()">
              <div class="mb-4">
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title</label>
                <input 
                  [(ngModel)]="newEventTitle" 
                  name="title"
                  class="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="e.g., Math Exam"
                />
              </div>
              <div class="mb-6">
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description (optional)</label>
                <input 
                  [(ngModel)]="newEventDescription" 
                  name="description"
                  class="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="e.g., Room 305, 10:00 AM"
                />
              </div>
              <div class="flex gap-3">
                <button type="button" (click)="showAddEventModal = false" class="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-white">
                  Cancel
                </button>
                <button type="submit" class="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
                  Add
                </button>
              </div>
            </form>
          </div>
        </div>
      }
    </div>
  `
})
export class DashboardComponent implements OnInit {
  spaces = signal<StudySpace[]>([]);
  loading = signal(true);
  showUserMenu = false;

  showCreateModal = false;
  showJoinModal = false;
  showAddEventModal = false;

  newSpaceName = '';
  newSpaceDescription = '';
  inviteCode = '';

  // Calendar state
  @ViewChild(MatCalendar) calendar!: MatCalendar<Date>;
  selectedDate: Date = new Date();
  calendarEvents = signal<CalendarEvent[]>([]);
  eventsForSelectedDate = signal<CalendarEvent[]>([]);
  newEventTitle = '';
  newEventDescription = '';

  constructor(
    private spaceService: SpaceService,
    private calendarService: CalendarService,
    public auth: AuthService,
    public theme: ThemeService
  ) { }

  ngOnInit() {
    this.loadSpaces();
    this.loadCalendarEvents();
  }

  userInitials(): string {
    const user = this.auth.user();
    if (!user) return '?';
    const first = user.firstName?.charAt(0) || user.email?.charAt(0) || '?';
    const last = user.lastName?.charAt(0) || '';
    return (first + last).toUpperCase();
  }

  async loadSpaces() {
    this.loading.set(true);
    try {
      const spaces = await this.spaceService.getMySpaces();
      this.spaces.set(spaces);
    } catch (err) {
      console.error('Failed to load spaces', err);
    } finally {
      this.loading.set(false);
    }
  }

  async createSpace() {
    if (!this.newSpaceName.trim()) return;

    try {
      await this.spaceService.createSpace({
        name: this.newSpaceName,
        description: this.newSpaceDescription,
      });
      this.showCreateModal = false;
      this.newSpaceName = '';
      this.newSpaceDescription = '';
      this.loadSpaces();
    } catch (err) {
      console.error('Failed to create space', err);
    }
  }

  async joinSpace() {
    if (!this.inviteCode.trim()) return;

    try {
      await this.spaceService.joinSpace(this.inviteCode);
      this.showJoinModal = false;
      this.inviteCode = '';
      this.loadSpaces();
    } catch (err) {
      console.error('Failed to join space', err);
    }
  }

  logout() {
    this.auth.logout();
  }

  // Calendar methods
  async loadCalendarEvents() {
    try {
      const events = await this.calendarService.getEvents().toPromise();
      this.calendarEvents.set(events || []);
      this.filterEventsForDate(this.selectedDate);
      if (this.calendar) {
        this.calendar.updateTodaysDate();
      }
    } catch (err) {
      console.error('Failed to load calendar events', err);
    }
  }

  onDateSelected(date: Date | null) {
    if (date) {
      this.selectedDate = date;
      this.filterEventsForDate(date);
    }
  }

  filterEventsForDate(date: Date) {
    const dateStr = this.formatDateToISO(date);
    const filtered = this.calendarEvents().filter(e => e.date === dateStr);
    this.eventsForSelectedDate.set(filtered);
  }

  async addEvent() {
    if (!this.newEventTitle.trim()) return;

    try {
      const dateStr = this.formatDateToISO(this.selectedDate);
      await this.calendarService.createEvent(dateStr, this.newEventTitle, this.newEventDescription).toPromise();
      this.showAddEventModal = false;
      this.newEventTitle = '';
      this.newEventDescription = '';
      this.loadCalendarEvents();
    } catch (err) {
      console.error('Failed to add event', err);
    }
  }

  async deleteEvent(eventId: string) {
    try {
      await this.calendarService.deleteEvent(eventId).toPromise();
      this.loadCalendarEvents();
    } catch (err) {
      console.error('Failed to delete event', err);
    }
  }

  dateClass = (date: Date): string => {
    const dateStr = this.formatDateToISO(date);
    const hasEvent = this.calendarEvents().some(e => e.date === dateStr);
    return hasEvent ? 'has-event' : '';
  }

  private formatDateToISO(date: Date): string {
    const offset = date.getTimezoneOffset();
    const localDate = new Date(date.getTime() - (offset * 60 * 1000));
    return localDate.toISOString().split('T')[0];
  }

  newDate(): Date {
    return new Date();
  }
}
