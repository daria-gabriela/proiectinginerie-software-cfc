package com.studysync.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "study_spaces")
public class StudySpace {
    @Id
    private String id;

    private String name;
    private String description;
    private String ownerUserId;

    @Indexed(unique = true)
    private String inviteCode;

    private Instant createdAt;
}
