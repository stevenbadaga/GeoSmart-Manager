package rw.venus.geosmartmanager.repo;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import rw.venus.geosmartmanager.entity.ReportEntity;

import java.util.List;
import java.util.Optional;

public interface ReportRepository extends JpaRepository<ReportEntity, Long> {
    List<ReportEntity> findByProjectId(Long projectId);
    long countByProjectId(Long projectId);

    Optional<ReportEntity> findByIdAndProjectId(Long id, Long projectId);

    @Query("select coalesce(sum(length(r.content)), 0) from ReportEntity r")
    long sumReportContentSize();
}
