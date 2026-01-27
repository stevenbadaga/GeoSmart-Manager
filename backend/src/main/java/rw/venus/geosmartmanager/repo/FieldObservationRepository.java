package rw.venus.geosmartmanager.repo;

import rw.venus.geosmartmanager.entity.FieldObservationEntity;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface FieldObservationRepository extends JpaRepository<FieldObservationEntity, UUID> {
    List<FieldObservationEntity> findByProjectIdOrderByCreatedAtDesc(UUID projectId);
    Optional<FieldObservationEntity> findByIdAndProjectId(UUID id, UUID projectId);
}

