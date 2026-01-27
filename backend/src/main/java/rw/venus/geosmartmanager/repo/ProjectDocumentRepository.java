package rw.venus.geosmartmanager.repo;

import rw.venus.geosmartmanager.entity.ProjectDocumentEntity;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProjectDocumentRepository extends JpaRepository<ProjectDocumentEntity, UUID> {
    List<ProjectDocumentEntity> findByProjectIdOrderByUploadedAtDesc(UUID projectId);
    Optional<ProjectDocumentEntity> findByIdAndProjectId(UUID id, UUID projectId);
}

