package rw.venus.geosmartmanager.repo;

import rw.venus.geosmartmanager.entity.ProjectEntity;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProjectRepository extends JpaRepository<ProjectEntity, UUID> {
    List<ProjectEntity> findByClientId(UUID clientId);
}

