package rw.venus.geosmartmanager.repo;

import org.springframework.data.jpa.repository.JpaRepository;
import rw.venus.geosmartmanager.entity.ProjectCommunicationEntity;

import java.util.List;

public interface ProjectCommunicationRepository extends JpaRepository<ProjectCommunicationEntity, Long> {
    List<ProjectCommunicationEntity> findByProjectIdOrderByOccurredAtDescCreatedAtDesc(Long projectId);
    long countByProjectId(Long projectId);
}
