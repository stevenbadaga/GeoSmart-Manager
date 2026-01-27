package rw.venus.geosmartmanager.repo;

import rw.venus.geosmartmanager.entity.InvoiceEntity;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface InvoiceRepository extends JpaRepository<InvoiceEntity, UUID> {
    List<InvoiceEntity> findByProjectIdOrderByCreatedAtDesc(UUID projectId);
    boolean existsByInvoiceNumber(String invoiceNumber);
    Optional<InvoiceEntity> findByIdAndProjectId(UUID id, UUID projectId);
}

