package com.studysync.controller;

import com.studysync.dto.ChatMessageDTO;
import com.studysync.service.ChatService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
@Tag(name = "Chat", description = "Space chat messaging")
public class ChatController {

    private final ChatService chatService;

    @GetMapping("/api/spaces/{spaceId}/chat")
    @Operation(summary = "Get chat messages for a space")
    public List<ChatMessageDTO> getMessages(@PathVariable String spaceId) {
        return chatService.getMessages(spaceId);
    }

    @PostMapping("/api/spaces/{spaceId}/chat")
    @Operation(summary = "Send a chat message to a space")
    public ResponseEntity<ChatMessageDTO> sendMessage(
            @PathVariable String spaceId,
            @RequestBody Map<String, String> body) {
        String content = body.get("content");
        if (content == null || content.trim().isEmpty()) {
            return ResponseEntity.badRequest().build();
        }
        ChatMessageDTO message = chatService.sendMessage(spaceId, content.trim());
        return ResponseEntity.status(HttpStatus.CREATED).body(message);
    }
}
