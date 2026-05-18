package rw.venus.geosmartmanager.repo;

import org.springframework.data.jpa.repository.JpaRepository;
import rw.venus.geosmartmanager.entity.PasswordResetTokenEntity;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

public interface PasswordResetTokenRepository extends JpaRepository<PasswordResetTokenEntity, Long> {
    Optional<PasswordResetTokenEntity> findByTokenHash(String tokenHash);
    List<PasswordResetTokenEntity> findByUserIdAndUsedAtIsNull(Long userId);
    void deleteByExpiresAtBefore(Instant cutoff);
}
