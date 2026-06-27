package rw.venus.geosmartmanager.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import rw.venus.geosmartmanager.entity.NotificationEntity;

import java.util.List;

public interface NotificationRepository extends JpaRepository<NotificationEntity, Long> {
    List<NotificationEntity> findAllByRecipientIdOrderByCreatedAtDesc(Long recipientId);
    List<NotificationEntity> findAllByRecipientIdAndRelatedConversationIdAndIsReadFalse(Long recipientId, Long relatedConversationId);
    long countAllByRecipientIdAndIsReadFalse(Long recipientId);
}
