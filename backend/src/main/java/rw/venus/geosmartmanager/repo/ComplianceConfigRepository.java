package rw.venus.geosmartmanager.repo;

import rw.venus.geosmartmanager.entity.ComplianceConfigEntity;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ComplianceConfigRepository extends JpaRepository<ComplianceConfigEntity, UUID> {
    Optional<ComplianceConfigEntity> findByProjectId(UUID projectId);
}

