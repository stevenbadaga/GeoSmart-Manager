package rw.venus.geosmartmanager.repo;

import rw.venus.geosmartmanager.entity.ProjectApprovalEntity;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProjectApprovalRepository extends JpaRepository<ProjectApprovalEntity, UUID> {
    List<ProjectApprovalEntity> findByProjectIdOrderByCreatedAtDesc(UUID projectId);
    Optional<ProjectApprovalEntity> findByIdAndProjectId(UUID id, UUID projectId);
}

