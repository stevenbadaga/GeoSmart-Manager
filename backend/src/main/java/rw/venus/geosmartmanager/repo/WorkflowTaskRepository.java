package rw.venus.geosmartmanager.repo;

import rw.venus.geosmartmanager.entity.WorkflowTaskEntity;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface WorkflowTaskRepository extends JpaRepository<WorkflowTaskEntity, UUID> {
    List<WorkflowTaskEntity> findByProjectIdOrderByCreatedAtDesc(UUID projectId);
}

