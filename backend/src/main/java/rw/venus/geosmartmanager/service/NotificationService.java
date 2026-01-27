package rw.venus.geosmartmanager.service;

import rw.venus.geosmartmanager.api.dto.NotificationDtos;
import rw.venus.geosmartmanager.entity.NotificationEntity;
import rw.venus.geosmartmanager.entity.ProjectEntity;
import rw.venus.geosmartmanager.entity.UserEntity;
import rw.venus.geosmartmanager.exception.ApiException;
import rw.venus.geosmartmanager.repo.NotificationRepository;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class NotificationService {
    private final NotificationRepository notificationRepository;

    public NotificationService(NotificationRepository notificationRepository) {
        this.notificationRepository = notificationRepository;
    }

    @Transactional(readOnly = true)
    public List<NotificationDtos.NotificationDto> list(UserEntity actor) {
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(actor.getId())
                .stream()
                .map(this::toDto)
                .toList();
    }

    @Transactional
    public void markRead(UserEntity actor, UUID notificationId) {
        NotificationEntity n = notificationRepository.findByIdAndUserId(notificationId, actor.getId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Notification not found"));
        if (n.getReadAt() == null) {
            n.setReadAt(Instant.now());
            notificationRepository.save(n);
        }
    }

    @Transactional
    public void notifyUser(UserEntity user, String type, String message, ProjectEntity project) {
        if (user == null) {
            return;
        }
        NotificationEntity n = new NotificationEntity();
        n.setUser(user);
        n.setType(type == null ? "GENERAL" : type);
        n.setMessage(message == null ? "" : message);
        n.setProject(project);
        notificationRepository.save(n);
    }

    private NotificationDtos.NotificationDto toDto(NotificationEntity n) {
        return new NotificationDtos.NotificationDto(
                n.getId(),
                n.getType(),
                n.getMessage(),
                n.getProject() == null ? null : n.getProject().getId(),
                n.getCreatedAt(),
                n.getReadAt()
        );
    }
}

