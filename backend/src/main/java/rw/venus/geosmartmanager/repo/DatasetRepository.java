package rw.venus.geosmartmanager.repo;

import rw.venus.geosmartmanager.entity.DatasetEntity;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DatasetRepository extends JpaRepository<DatasetEntity, UUID> {
    List<DatasetEntity> findByProjectId(UUID projectId);
}

