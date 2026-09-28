package com.studysync.repository;

import com.studysync.model.StudySpace;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface StudySpaceRepository extends MongoRepository<StudySpace, String> {
    Optional<StudySpace> findByInviteCode(String inviteCode);
    List<StudySpace> findByOwnerUserId(String ownerUserId);
}
