package com.studysync.service;

import com.studysync.dto.CalendarEventDTO;
import com.studysync.model.CalendarEvent;
import com.studysync.repository.CalendarEventRepository;
import com.studysync.security.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
public class CalendarService {

    private final CalendarEventRepository calendarEventRepository;

    public List<CalendarEventDTO> getEvents() {
        String userId = SecurityUtils.getCurrentUserId();
        return calendarEventRepository.findByUserIdOrderByDateAsc(userId).stream()
                .map(this::toDTO)
                .toList();
    }

    public List<CalendarEventDTO> getEventsForDate(LocalDate date) {
        String userId = SecurityUtils.getCurrentUserId();
        return calendarEventRepository.findByUserIdAndDate(userId, date).stream()
                .map(this::toDTO)
                .toList();
    }

    public List<CalendarEventDTO> getEventsForMonth(int year, int month) {
        String userId = SecurityUtils.getCurrentUserId();
        LocalDate startDate = LocalDate.of(year, month, 1);
        LocalDate endDate = startDate.plusMonths(1).minusDays(1);
        return calendarEventRepository.findByUserIdAndDateBetween(userId, startDate, endDate).stream()
                .map(this::toDTO)
                .toList();
    }

    public CalendarEventDTO createEvent(LocalDate date, String title, String description) {
        String userId = SecurityUtils.getCurrentUserId();

        CalendarEvent event = CalendarEvent.builder()
                .userId(userId)
                .date(date)
                .title(title)
                .description(description)
                .createdAt(Instant.now())
                .build();

        event = calendarEventRepository.save(event);
        return toDTO(event);
    }

    public void deleteEvent(String eventId) {
        String userId = SecurityUtils.getCurrentUserId();
        CalendarEvent event = calendarEventRepository.findById(eventId)
                .orElseThrow(() -> new IllegalArgumentException("Event not found"));

        if (!event.getUserId().equals(userId)) {
            throw new IllegalStateException("Not authorized to delete this event");
        }

        calendarEventRepository.delete(event);
    }

    private CalendarEventDTO toDTO(CalendarEvent event) {
        return CalendarEventDTO.builder()
                .id(event.getId())
                .userId(event.getUserId())
                .date(event.getDate())
                .title(event.getTitle())
                .description(event.getDescription())
                .createdAt(event.getCreatedAt())
                .build();
    }
}
