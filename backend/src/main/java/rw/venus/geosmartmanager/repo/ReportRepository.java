package rw.venus.geosmartmanager.repo;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import rw.venus.geosmartmanager.entity.ReportEntity;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

public interface ReportRepository extends JpaRepository<ReportEntity, Long> {
    List<ReportEntity> findByProjectId(Long projectId);
    List<ReportEntity> findByProjectIdOrderByCreatedAtDesc(Long projectId);
    List<ReportEntity> findByGeneratedById(Long generatedById);
    long countByProjectId(Long projectId);

    Optional<ReportEntity> findByIdAndProjectId(Long id, Long projectId);
    Optional<ReportEntity> findTopByProjectIdAndTypeOrderByCreatedAtDesc(Long projectId, rw.venus.geosmartmanager.domain.ReportType type);

    long countByGeneratedBy(rw.venus.geosmartmanager.entity.UserEntity user);
    long countByGeneratedByAndCreatedAtAfter(rw.venus.geosmartmanager.entity.UserEntity user, Instant after);
    long countByProjectIdIn(java.util.List<Long> projectIds);

    @Query("select coalesce(sum(length(r.content)), 0) from ReportEntity r")
    long sumReportContentSize();
}
