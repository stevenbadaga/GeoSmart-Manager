package rw.venus.geosmartmanager.repo;

import org.springframework.data.jpa.repository.JpaRepository;
import rw.venus.geosmartmanager.entity.UserSessionEntity;

import java.util.List;
import java.util.Optional;

public interface UserSessionRepository extends JpaRepository<UserSessionEntity, Long> {
    Optional<UserSessionEntity> findBySessionId(String sessionId);
    Optional<UserSessionEntity> findBySessionIdAndUserId(String sessionId, Long userId);
    List<UserSessionEntity> findByUserIdOrderByLastSeenAtDesc(Long userId);
    List<UserSessionEntity> findByUserIdAndRevokedAtIsNullAndSessionIdNot(Long userId, String sessionId);
}
