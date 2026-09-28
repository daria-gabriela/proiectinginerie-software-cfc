import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface CalendarEvent {
    id: string;
    userId: string;
    date: string;  // ISO date string (YYYY-MM-DD)
    title: string;
    description?: string;
    createdAt: string;
}

@Injectable({
    providedIn: 'root'
})
export class CalendarService {
    constructor(private http: HttpClient) { }

    getEvents(): Observable<CalendarEvent[]> {
        return this.http.get<CalendarEvent[]>('/api/calendar');
    }

    getEventsForDate(date: string): Observable<CalendarEvent[]> {
        return this.http.get<CalendarEvent[]>(`/api/calendar/date/${date}`);
    }

    getEventsForMonth(year: number, month: number): Observable<CalendarEvent[]> {
        return this.http.get<CalendarEvent[]>(`/api/calendar/month/${year}/${month}`);
    }

    createEvent(date: string, title: string, description?: string): Observable<CalendarEvent> {
        return this.http.post<CalendarEvent>('/api/calendar', { date, title, description });
    }

    deleteEvent(id: string): Observable<void> {
        return this.http.delete<void>(`/api/calendar/${id}`);
    }
}
