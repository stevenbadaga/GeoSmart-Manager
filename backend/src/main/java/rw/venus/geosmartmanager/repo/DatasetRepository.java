package rw.venus.geosmartmanager.repo;

import rw.venus.geosmartmanager.entity.DatasetEntity;
import rw.venus.geosmartmanager.domain.DatasetType;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DatasetRepository extends JpaRepository<DatasetEntity, UUID> {
    List<DatasetEntity> findByProjectIdOrderByUploadedAtDesc(UUID projectId);

    Optional<DatasetEntity> findFirstByProjectIdAndTypeOrderByUploadedAtDesc(UUID projectId, DatasetType type);

    Optional<DatasetEntity> findTopByProjectIdAndNameAndTypeOrderByVersionDesc(UUID projectId, String name, DatasetType type);

    long countByProjectIdIn(Collection<UUID> projectIds);
}
