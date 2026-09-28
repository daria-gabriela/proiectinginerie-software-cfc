package com.studysync.controller;

import com.studysync.dto.CalendarEventDTO;
import com.studysync.service.CalendarService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
@Tag(name = "Calendar", description = "Personal calendar events")
public class CalendarController {

    private final CalendarService calendarService;

    @GetMapping("/api/calendar")
    @Operation(summary = "Get all calendar events for current user")
    public List<CalendarEventDTO> getEvents() {
        return calendarService.getEvents();
    }

    @GetMapping("/api/calendar/date/{date}")
    @Operation(summary = "Get events for a specific date")
    public List<CalendarEventDTO> getEventsForDate(
            @PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return calendarService.getEventsForDate(date);
    }

    @GetMapping("/api/calendar/month/{year}/{month}")
    @Operation(summary = "Get events for a specific month")
    public List<CalendarEventDTO> getEventsForMonth(
            @PathVariable int year,
            @PathVariable int month) {
        return calendarService.getEventsForMonth(year, month);
    }

    @PostMapping("/api/calendar")
    @Operation(summary = "Create a new calendar event")
    public ResponseEntity<CalendarEventDTO> createEvent(@RequestBody Map<String, String> body) {
        String dateStr = body.get("date");
        String title = body.get("title");
        String description = body.get("description");

        if (dateStr == null || title == null || title.trim().isEmpty()) {
            return ResponseEntity.badRequest().build();
        }

        LocalDate date = LocalDate.parse(dateStr);
        CalendarEventDTO event = calendarService.createEvent(date, title.trim(), description);
        return ResponseEntity.status(HttpStatus.CREATED).body(event);
    }

    @DeleteMapping("/api/calendar/{id}")
    @Operation(summary = "Delete a calendar event")
    public ResponseEntity<Void> deleteEvent(@PathVariable String id) {
        calendarService.deleteEvent(id);
        return ResponseEntity.noContent().build();
    }
}
