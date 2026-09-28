package com.studysync.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "calendar_events")
public class CalendarEvent {
    @Id
    private String id;

    private String userId;
    private LocalDate date;
    private String title;
    private String description;
    private Instant createdAt;
}
