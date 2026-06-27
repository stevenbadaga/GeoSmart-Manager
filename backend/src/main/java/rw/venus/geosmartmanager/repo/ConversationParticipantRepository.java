package rw.venus.geosmartmanager.repo;

import org.springframework.data.jpa.repository.JpaRepository;
import rw.venus.geosmartmanager.entity.ConversationParticipantEntity;

import java.util.List;
import java.util.Optional;

public interface ConversationParticipantRepository extends JpaRepository<ConversationParticipantEntity, Long> {
    boolean existsByConversationIdAndUserId(Long conversationId, Long userId);
    List<ConversationParticipantEntity> findByConversationId(Long conversationId);
    List<ConversationParticipantEntity> findByConversationIdAndUserIdNot(Long conversationId, Long userId);
    Optional<ConversationParticipantEntity> findByConversationIdAndUserId(Long conversationId, Long userId);
}
