package com.studysync.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "space_memberships")
public class SpaceMembership {
    @Id
    private String id;

    private String spaceId;
    private String userId;
    private MemberRole role;
    private Instant joinedAt;
}
