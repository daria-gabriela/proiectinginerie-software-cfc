package com.studysync.repository;

import com.studysync.model.ChatMessage;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ChatMessageRepository extends MongoRepository<ChatMessage, String> {
    List<ChatMessage> findBySpaceIdOrderByCreatedAtAsc(String spaceId);

    List<ChatMessage> findTop100BySpaceIdOrderByCreatedAtDesc(String spaceId);
}
