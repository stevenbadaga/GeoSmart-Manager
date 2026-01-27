package rw.venus.geosmartmanager.api.controller;

import rw.venus.geosmartmanager.api.dto.InvoiceDtos;
import rw.venus.geosmartmanager.service.CurrentUserService;
import rw.venus.geosmartmanager.service.InvoiceService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/projects/{projectId}/invoices")
public class InvoiceController {
    private final InvoiceService invoiceService;
    private final CurrentUserService currentUserService;

    public InvoiceController(InvoiceService invoiceService, CurrentUserService currentUserService) {
        this.invoiceService = invoiceService;
        this.currentUserService = currentUserService;
    }

    @GetMapping
    public List<InvoiceDtos.InvoiceDto> list(@PathVariable UUID projectId) {
        return invoiceService.list(currentUserService.requireCurrentUser(), projectId);
    }

    @PostMapping
    public InvoiceDtos.InvoiceDto create(@PathVariable UUID projectId, @Valid @RequestBody InvoiceDtos.CreateInvoiceRequest req) {
        return invoiceService.create(currentUserService.requireCurrentUser(), projectId, req);
    }

    @PutMapping("/{invoiceId}")
    public InvoiceDtos.InvoiceDto update(
            @PathVariable UUID projectId,
            @PathVariable UUID invoiceId,
            @Valid @RequestBody InvoiceDtos.UpdateInvoiceRequest req
    ) {
        return invoiceService.update(currentUserService.requireCurrentUser(), projectId, invoiceId, req);
    }

    @PostMapping("/{invoiceId}/payments")
    public InvoiceDtos.InvoiceDto addPayment(
            @PathVariable UUID projectId,
            @PathVariable UUID invoiceId,
            @RequestBody InvoiceDtos.AddPaymentRequest req
    ) {
        return invoiceService.addPayment(currentUserService.requireCurrentUser(), projectId, invoiceId, req);
    }
}

