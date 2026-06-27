package rw.venus.geosmartmanager.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import rw.venus.geosmartmanager.entity.NotificationEntity;
import rw.venus.geosmartmanager.repository.NotificationRepository;

import java.time.Instant;
import java.util.List;

@Service
public class NotificationService {
    private final NotificationRepository notificationRepository;

    public NotificationService(NotificationRepository notificationRepository) {
        this.notificationRepository = notificationRepository;
    }

    @Transactional
    public NotificationEntity create(Long recipientId, String title, String message, String type, Long projectId) {
        return create(recipientId, title, message, type, projectId, null);
    }

    @Transactional
    public NotificationEntity create(Long recipientId, String title, String message, String type, Long projectId, Long conversationId) {
        return notificationRepository.save(NotificationEntity.builder()
                .recipientId(recipientId)
                .title(title)
                .message(message)
                .type(type)
                .relatedProjectId(projectId)
                .relatedConversationId(conversationId)
                .isRead(false)
                .createdAt(Instant.now())
                .build());
    }

    public List<NotificationEntity> listForUser(Long userId) {
        return notificationRepository.findAllByRecipientIdOrderByCreatedAtDesc(userId);
    }

    public long countUnread(Long userId) {
        return notificationRepository.countAllByRecipientIdAndIsReadFalse(userId);
    }

    @Transactional
    public void markAsRead(Long id) {
        notificationRepository.findById(id).ifPresent(n -> {
            n.setRead(true);
            notificationRepository.save(n);
        });
    }

    @Transactional
    public void markAllAsRead(Long userId) {
        notificationRepository.findAllByRecipientIdOrderByCreatedAtDesc(userId).forEach(n -> {
            if (!n.isRead()) {
                n.setRead(true);
                notificationRepository.save(n);
            }
        });
    }

    @Transactional
    public void markConversationNotificationsAsRead(Long userId, Long conversationId) {
        notificationRepository.findAllByRecipientIdAndRelatedConversationIdAndIsReadFalse(userId, conversationId).forEach(n -> {
            n.setRead(true);
            notificationRepository.save(n);
        });
    }
}
