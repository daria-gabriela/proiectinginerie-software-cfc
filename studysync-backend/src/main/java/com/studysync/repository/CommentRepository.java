package com.studysync.repository;

import com.studysync.model.Comment;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface CommentRepository extends MongoRepository<Comment, String> {
    List<Comment> findByDocumentId(String documentId);
    List<Comment> findByPassageId(String passageId);
    List<Comment> findBySpaceId(String spaceId);
    void deleteBySpaceId(String spaceId);
    void deleteByDocumentId(String documentId);
}
