package rw.venus.geosmartmanager.repo;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import rw.venus.geosmartmanager.domain.ConversationType;
import rw.venus.geosmartmanager.entity.ConversationEntity;

import java.util.List;
import java.util.Optional;

public interface ConversationRepository extends JpaRepository<ConversationEntity, Long> {
    @Query("""
            select c from ConversationEntity c
            where c.id in (
                select p.conversation.id from ConversationParticipantEntity p where p.userId = :userId
            )
            order by coalesce(c.lastMessageAt, c.createdAt) desc
            """)
    List<ConversationEntity> findVisibleForUser(@Param("userId") Long userId);

    @Query("""
            select c from ConversationEntity c
            where c.type = :type
              and c.id in (select p.conversation.id from ConversationParticipantEntity p where p.userId = :firstUserId)
              and c.id in (select p.conversation.id from ConversationParticipantEntity p where p.userId = :secondUserId)
              and (select count(p) from ConversationParticipantEntity p where p.conversation = c) = 2
            """)
    Optional<ConversationEntity> findDirectBetweenUsers(@Param("type") ConversationType type,
                                                       @Param("firstUserId") Long firstUserId,
                                                       @Param("secondUserId") Long secondUserId);
}
