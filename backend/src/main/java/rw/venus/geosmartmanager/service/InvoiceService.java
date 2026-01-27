package rw.venus.geosmartmanager.service;

import rw.venus.geosmartmanager.api.dto.InvoiceDtos;
import rw.venus.geosmartmanager.domain.InvoiceStatus;
import rw.venus.geosmartmanager.entity.InvoiceEntity;
import rw.venus.geosmartmanager.entity.InvoicePaymentEntity;
import rw.venus.geosmartmanager.entity.ProjectEntity;
import rw.venus.geosmartmanager.entity.UserEntity;
import rw.venus.geosmartmanager.exception.ApiException;
import rw.venus.geosmartmanager.repo.InvoicePaymentRepository;
import rw.venus.geosmartmanager.repo.InvoiceRepository;
import rw.venus.geosmartmanager.repo.ProjectRepository;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class InvoiceService {
    private final ProjectRepository projectRepository;
    private final InvoiceRepository invoiceRepository;
    private final InvoicePaymentRepository invoicePaymentRepository;
    private final ProjectAccessService projectAccessService;
    private final AuditService auditService;

    public InvoiceService(
            ProjectRepository projectRepository,
            InvoiceRepository invoiceRepository,
            InvoicePaymentRepository invoicePaymentRepository,
            ProjectAccessService projectAccessService,
            AuditService auditService
    ) {
        this.projectRepository = projectRepository;
        this.invoiceRepository = invoiceRepository;
        this.invoicePaymentRepository = invoicePaymentRepository;
        this.projectAccessService = projectAccessService;
        this.auditService = auditService;
    }

    @Transactional(readOnly = true)
    public List<InvoiceDtos.InvoiceDto> list(UserEntity actor, UUID projectId) {
        projectAccessService.requireProjectRead(actor, projectId);
        return invoiceRepository.findByProjectIdOrderByCreatedAtDesc(projectId).stream().map(this::toDto).toList();
    }

    @Transactional
    public InvoiceDtos.InvoiceDto create(UserEntity actor, UUID projectId, InvoiceDtos.CreateInvoiceRequest req) {
        projectAccessService.requireProjectAdmin(actor, projectId);

        if (invoiceRepository.existsByInvoiceNumber(req.invoiceNumber())) {
            throw new ApiException(HttpStatus.CONFLICT, "INVOICE_NUMBER_TAKEN", "Invoice number already exists");
        }

        ProjectEntity project = projectRepository.findById(projectId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Project not found"));

        InvoiceEntity inv = new InvoiceEntity();
        inv.setProject(project);
        inv.setInvoiceNumber(req.invoiceNumber());
        inv.setStatus(req.status());
        inv.setCurrency(req.currency());
        inv.setAmount(req.amount());
        inv.setDueDate(req.dueDate());
        inv.setNotes(req.notes());
        InvoiceEntity saved = invoiceRepository.save(inv);

        auditService.log(actor, "INVOICE_CREATED", "Invoice", saved.getId());
        return toDto(saved);
    }

    @Transactional
    public InvoiceDtos.InvoiceDto update(UserEntity actor, UUID projectId, UUID invoiceId, InvoiceDtos.UpdateInvoiceRequest req) {
        projectAccessService.requireProjectAdmin(actor, projectId);

        InvoiceEntity inv = invoiceRepository.findByIdAndProjectId(invoiceId, projectId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Invoice not found"));
        inv.setStatus(req.status());
        inv.setCurrency(req.currency());
        inv.setAmount(req.amount());
        inv.setDueDate(req.dueDate());
        inv.setNotes(req.notes());
        InvoiceEntity saved = invoiceRepository.save(inv);

        auditService.log(actor, "INVOICE_UPDATED", "Invoice", saved.getId());
        return toDto(saved);
    }

    @Transactional
    public InvoiceDtos.InvoiceDto addPayment(UserEntity actor, UUID projectId, UUID invoiceId, InvoiceDtos.AddPaymentRequest req) {
        projectAccessService.requireProjectAdmin(actor, projectId);

        InvoiceEntity inv = invoiceRepository.findByIdAndProjectId(invoiceId, projectId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Invoice not found"));

        InvoicePaymentEntity p = new InvoicePaymentEntity();
        p.setInvoice(inv);
        p.setAmount(req.amount());
        p.setMethod(req.method());
        p.setReference(req.reference());
        p.setPaidAt(req.paidAt() == null ? Instant.now() : req.paidAt());
        InvoicePaymentEntity savedPayment = invoicePaymentRepository.save(p);

        List<InvoicePaymentEntity> payments = invoicePaymentRepository.findByInvoiceIdOrderByPaidAtDesc(invoiceId);
        double totalPaid = payments.stream().mapToDouble(InvoicePaymentEntity::getAmount).sum();
        if (totalPaid >= inv.getAmount() && inv.getStatus() != InvoiceStatus.CANCELLED) {
            inv.setStatus(InvoiceStatus.PAID);
            invoiceRepository.save(inv);
        }

        auditService.log(actor, "INVOICE_PAYMENT_ADDED", "InvoicePayment", savedPayment.getId());
        return toDto(inv);
    }

    private InvoiceDtos.InvoiceDto toDto(InvoiceEntity inv) {
        List<InvoiceDtos.PaymentDto> payments = invoicePaymentRepository.findByInvoiceIdOrderByPaidAtDesc(inv.getId()).stream()
                .map(p -> new InvoiceDtos.PaymentDto(p.getId(), p.getAmount(), p.getMethod(), p.getReference(), p.getPaidAt()))
                .toList();
        return new InvoiceDtos.InvoiceDto(
                inv.getId(),
                inv.getProject().getId(),
                inv.getInvoiceNumber(),
                inv.getStatus(),
                inv.getCurrency(),
                inv.getAmount(),
                inv.getDueDate(),
                inv.getNotes(),
                inv.getCreatedAt(),
                payments
        );
    }
}

