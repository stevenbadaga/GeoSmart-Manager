package rw.venus.geosmartmanager.repo;

import rw.venus.geosmartmanager.entity.ComplianceCheckEntity;
import java.util.Collection;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ComplianceCheckRepository extends JpaRepository<ComplianceCheckEntity, UUID> {
    List<ComplianceCheckEntity> findByProjectIdOrderByCheckedAtDesc(UUID projectId);

    long countByProjectIdIn(Collection<UUID> projectIds);
}
