package rw.venus.geosmartmanager.repo;

import rw.venus.geosmartmanager.entity.ProjectMeetingEntity;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProjectMeetingRepository extends JpaRepository<ProjectMeetingEntity, UUID> {
    List<ProjectMeetingEntity> findByProjectIdOrderByScheduledAtDesc(UUID projectId);
    Optional<ProjectMeetingEntity> findByIdAndProjectId(UUID id, UUID projectId);
}

