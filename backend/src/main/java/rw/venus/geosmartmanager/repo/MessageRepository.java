package rw.venus.geosmartmanager.repo;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import rw.venus.geosmartmanager.entity.MessageEntity;

import java.util.List;
import java.util.Optional;

public interface MessageRepository extends JpaRepository<MessageEntity, Long> {
    List<MessageEntity> findByConversationIdAndDeletedAtIsNullOrderByCreatedAtAsc(Long conversationId);

    Optional<MessageEntity> findTopByConversationIdAndDeletedAtIsNullOrderByCreatedAtDesc(Long conversationId);

    long countByConversationIdAndSenderIdNotAndDeletedAtIsNull(Long conversationId, Long senderId);

    @Query("""
            select count(m) from MessageEntity m
            join ConversationParticipantEntity p on p.conversation.id = m.conversation.id
            where p.userId = :userId
              and m.sender.id <> :userId
              and m.deletedAt is null
              and (p.lastReadAt is null or m.createdAt > p.lastReadAt)
            """)
    long countUnreadForUser(@Param("userId") Long userId);

    @Query("""
            select count(m) from MessageEntity m
            join ConversationParticipantEntity p on p.conversation.id = m.conversation.id
            where p.userId = :userId
              and m.conversation.id = :conversationId
              and m.sender.id <> :userId
              and m.deletedAt is null
              and (p.lastReadAt is null or m.createdAt > p.lastReadAt)
            """)
    long countUnreadForConversation(@Param("userId") Long userId, @Param("conversationId") Long conversationId);
}
