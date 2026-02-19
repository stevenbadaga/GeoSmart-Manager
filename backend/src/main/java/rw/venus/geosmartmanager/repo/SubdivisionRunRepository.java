package rw.venus.geosmartmanager.repo;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import rw.venus.geosmartmanager.entity.SubdivisionRunEntity;

import java.util.List;

public interface SubdivisionRunRepository extends JpaRepository<SubdivisionRunEntity, Long> {
    List<SubdivisionRunEntity> findByProjectId(Long projectId);
    long countByProjectId(Long projectId);

    @Query("select coalesce(sum(length(s.resultGeoJson)), 0) from SubdivisionRunEntity s")
    long sumResultGeoJsonSize();
}
