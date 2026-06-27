package rw.venus.geosmartmanager.repo;

import org.springframework.data.jpa.repository.JpaRepository;
import rw.venus.geosmartmanager.domain.ProjectStatus;
import rw.venus.geosmartmanager.entity.ProjectEntity;

import java.util.List;
import java.time.Instant;

public interface ProjectRepository extends JpaRepository<ProjectEntity, Long> {
    List<ProjectEntity> findByClientId(Long clientId);
    List<ProjectEntity> findByAssignedSurveyorId(Long assignedSurveyorId);
    List<ProjectEntity> findByArchivedAtIsNull();
    List<ProjectEntity> findByArchivedAtIsNotNull();

    long countByStatus(ProjectStatus status);

    long countByStatusNot(ProjectStatus status);

    long countByCreatedAtAfter(Instant after);

    long countByAssignedSurveyorId(Long id);
    long countByAssignedSurveyorIdAndStatus(Long id, ProjectStatus status);
    long countByClientId(Long id);
    boolean existsByClientIdAndAssignedSurveyorId(Long clientId, Long assignedSurveyorId);
}
