package com.studysync.repository;

import com.studysync.model.StudyDocument;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface DocumentRepository extends MongoRepository<StudyDocument, String> {
    List<StudyDocument> findBySpaceId(String spaceId);
    void deleteBySpaceId(String spaceId);
}
