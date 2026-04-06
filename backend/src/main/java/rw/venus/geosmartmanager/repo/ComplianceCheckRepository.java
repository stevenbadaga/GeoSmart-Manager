package rw.venus.geosmartmanager.repo;

import org.springframework.data.jpa.repository.JpaRepository;
import rw.venus.geosmartmanager.domain.ComplianceStatus;
import rw.venus.geosmartmanager.entity.ComplianceCheckEntity;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface ComplianceCheckRepository extends JpaRepository<ComplianceCheckEntity, Long> {
    List<ComplianceCheckEntity> findByProjectId(Long projectId);
    Optional<ComplianceCheckEntity> findByIdAndProjectId(Long id, Long projectId);
    Optional<ComplianceCheckEntity> findTopByProjectIdAndSubdivisionRunIdOrderByCheckedAtDesc(Long projectId, Long subdivisionRunId);
    long countByProjectId(Long projectId);

    long countByStatus(ComplianceStatus status);

    @Query("select coalesce(sum(length(c.findings)), 0) from ComplianceCheckEntity c")
    long sumFindingsSize();
}
