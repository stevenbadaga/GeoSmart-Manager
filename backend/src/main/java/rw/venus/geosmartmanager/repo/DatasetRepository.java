package rw.venus.geosmartmanager.repo;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import rw.venus.geosmartmanager.domain.DatasetType;
import rw.venus.geosmartmanager.entity.DatasetEntity;

import java.util.List;

public interface DatasetRepository extends JpaRepository<DatasetEntity, Long> {
    List<DatasetEntity> findByProjectId(Long projectId);
    long countByProjectId(Long projectId);

    List<DatasetEntity> findByProjectIdAndType(Long projectId, DatasetType type);

    @Query("select coalesce(sum(length(d.geoJson)), 0) from DatasetEntity d")
    long sumGeoJsonSize();
}
