package com.studysync.repository;

import com.studysync.model.CalendarEvent;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface CalendarEventRepository extends MongoRepository<CalendarEvent, String> {
    List<CalendarEvent> findByUserIdOrderByDateAsc(String userId);

    List<CalendarEvent> findByUserIdAndDate(String userId, LocalDate date);

    List<CalendarEvent> findByUserIdAndDateBetween(String userId, LocalDate startDate, LocalDate endDate);
}
