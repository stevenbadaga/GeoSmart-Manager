package rw.venus.geosmartmanager.repo;

import rw.venus.geosmartmanager.entity.InvoicePaymentEntity;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface InvoicePaymentRepository extends JpaRepository<InvoicePaymentEntity, UUID> {
    List<InvoicePaymentEntity> findByInvoiceIdOrderByPaidAtDesc(UUID invoiceId);
}

