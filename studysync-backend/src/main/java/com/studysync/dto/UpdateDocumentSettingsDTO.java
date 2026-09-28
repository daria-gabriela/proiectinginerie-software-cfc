package com.studysync.dto;

import lombok.Data;

@Data
public class UpdateDocumentSettingsDTO {
    private Integer chunkTokens;  // 100-1000, null means keep current
}
