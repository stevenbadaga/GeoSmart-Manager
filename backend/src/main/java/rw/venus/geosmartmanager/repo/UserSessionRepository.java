package rw.venus.geosmartmanager.repo;

import rw.venus.geosmartmanager.entity.UserSessionEntity;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserSessionRepository extends JpaRepository<UserSessionEntity, UUID> {
    List<UserSessionEntity> findByUserIdOrderByLastSeenAtDesc(UUID userId);
    Optional<UserSessionEntity> findByIdAndUserId(UUID id, UUID userId);
}

