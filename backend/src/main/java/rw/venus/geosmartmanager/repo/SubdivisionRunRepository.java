package rw.venus.geosmartmanager.repo;

import rw.venus.geosmartmanager.entity.SubdivisionRunEntity;
import java.util.Collection;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SubdivisionRunRepository extends JpaRepository<SubdivisionRunEntity, UUID> {
    List<SubdivisionRunEntity> findByProjectIdOrderByStartedAtDesc(UUID projectId);

    long countByProjectIdIn(Collection<UUID> projectIds);
}
