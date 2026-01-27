package rw.venus.geosmartmanager.repo;

import rw.venus.geosmartmanager.entity.EquipmentLogEntity;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface EquipmentLogRepository extends JpaRepository<EquipmentLogEntity, UUID> {
    List<EquipmentLogEntity> findByProjectIdOrderByCreatedAtDesc(UUID projectId);
    Optional<EquipmentLogEntity> findByIdAndProjectId(UUID id, UUID projectId);
}

