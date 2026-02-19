package rw.venus.geosmartmanager.repo;

import org.springframework.data.jpa.repository.JpaRepository;
import rw.venus.geosmartmanager.domain.WorkflowStatus;
import rw.venus.geosmartmanager.entity.WorkflowTaskEntity;

import java.util.List;

public interface WorkflowTaskRepository extends JpaRepository<WorkflowTaskEntity, Long> {
    List<WorkflowTaskEntity> findByProjectId(Long projectId);
    long countByProjectIdAndStatusNot(Long projectId, WorkflowStatus status);

    long countByStatusNot(WorkflowStatus status);
}
