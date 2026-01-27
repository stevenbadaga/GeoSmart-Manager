package rw.venus.geosmartmanager.repo;

import rw.venus.geosmartmanager.entity.ProjectMessageEntity;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProjectMessageRepository extends JpaRepository<ProjectMessageEntity, UUID> {
    List<ProjectMessageEntity> findByProjectIdOrderByCreatedAtDesc(UUID projectId);
}

