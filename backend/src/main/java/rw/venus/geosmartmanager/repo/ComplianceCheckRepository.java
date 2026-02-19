package rw.venus.geosmartmanager.repo;

import org.springframework.data.jpa.repository.JpaRepository;
import rw.venus.geosmartmanager.domain.ComplianceStatus;
import rw.venus.geosmartmanager.entity.ComplianceCheckEntity;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface ComplianceCheckRepository extends JpaRepository<ComplianceCheckEntity, Long> {
    List<ComplianceCheckEntity> findByProjectId(Long projectId);
    long countByProjectId(Long projectId);

    long countByStatus(ComplianceStatus status);

    @Query("select coalesce(sum(length(c.findings)), 0) from ComplianceCheckEntity c")
    long sumFindingsSize();
}
