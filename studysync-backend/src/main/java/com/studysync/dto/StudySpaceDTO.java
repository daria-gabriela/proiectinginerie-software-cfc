package com.studysync.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class StudySpaceDTO {
    private String id;
    private String name;
    private String description;
    private String inviteCode;
    private String ownerUserId;
    private List<MemberDTO> members;

    @Data
    @Builder
    public static class MemberDTO {
        private String userId;
        private String firstName;
        private String lastName;
        private String email;
        private String role;
    }
}
