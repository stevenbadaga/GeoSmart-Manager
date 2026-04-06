package rw.venus.geosmartmanager.repo;

import org.springframework.data.jpa.repository.JpaRepository;
import rw.venus.geosmartmanager.entity.ProjectDocumentEntity;

import java.util.List;

public interface ProjectDocumentRepository extends JpaRepository<ProjectDocumentEntity, Long> {
    List<ProjectDocumentEntity> findByProjectIdOrderByCreatedAtDesc(Long projectId);
    long countByProjectId(Long projectId);
}
