package com.studysync.repository;

import com.studysync.model.SpaceMembership;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface SpaceMembershipRepository extends MongoRepository<SpaceMembership, String> {
    List<SpaceMembership> findByUserId(String userId);
    List<SpaceMembership> findBySpaceId(String spaceId);
    Optional<SpaceMembership> findBySpaceIdAndUserId(String spaceId, String userId);
    void deleteBySpaceId(String spaceId);
}
