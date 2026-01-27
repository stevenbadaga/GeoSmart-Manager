package rw.venus.geosmartmanager.repo;

import rw.venus.geosmartmanager.entity.UserEntity;
import rw.venus.geosmartmanager.domain.UserRole;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserRepository extends JpaRepository<UserEntity, UUID> {
    Optional<UserEntity> findByUsername(String username);
    boolean existsByUsername(String username);
    boolean existsByEmail(String email);
    List<UserEntity> findByRole(UserRole role);
}
