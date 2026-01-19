package rw.venus.geosmartmanager.repo;

import rw.venus.geosmartmanager.entity.ReportEntity;
import java.util.Collection;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ReportRepository extends JpaRepository<ReportEntity, UUID> {
    List<ReportEntity> findByProjectIdOrderByCreatedAtDesc(UUID projectId);

    long countByProjectIdIn(Collection<UUID> projectIds);
}
