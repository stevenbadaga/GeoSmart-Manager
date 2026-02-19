package rw.venus.geosmartmanager.repo;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import rw.venus.geosmartmanager.entity.AuditLogEntity;

import java.util.List;
import java.util.Optional;

public interface AuditLogRepository extends JpaRepository<AuditLogEntity, Long> {
    Optional<AuditLogEntity> findTopByOrderByIdDesc();
    List<AuditLogEntity> findAllByOrderByIdAsc();

    @Query("select coalesce(sum(length(a.details)), 0) from AuditLogEntity a")
    long sumDetailsSize();
}
