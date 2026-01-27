package rw.venus.geosmartmanager.repo;

import rw.venus.geosmartmanager.entity.NotificationEntity;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface NotificationRepository extends JpaRepository<NotificationEntity, UUID> {
    List<NotificationEntity> findByUserIdOrderByCreatedAtDesc(UUID userId);
    Optional<NotificationEntity> findByIdAndUserId(UUID id, UUID userId);
}

