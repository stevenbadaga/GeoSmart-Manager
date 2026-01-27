package rw.venus.geosmartmanager.api.dto;

import rw.venus.geosmartmanager.domain.InvoiceStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public final class InvoiceDtos {
    private InvoiceDtos() {}

    public record PaymentDto(
            UUID id,
            double amount,
            String method,
            String reference,
            Instant paidAt
    ) {}

    public record InvoiceDto(
            UUID id,
            UUID projectId,
            String invoiceNumber,
            InvoiceStatus status,
            String currency,
            double amount,
            LocalDate dueDate,
            String notes,
            Instant createdAt,
            List<PaymentDto> payments
    ) {}

    public record CreateInvoiceRequest(
            @NotBlank String invoiceNumber,
            @NotNull InvoiceStatus status,
            @NotBlank String currency,
            double amount,
            LocalDate dueDate,
            String notes
    ) {}

    public record UpdateInvoiceRequest(
            @NotNull InvoiceStatus status,
            @NotBlank String currency,
            double amount,
            LocalDate dueDate,
            String notes
    ) {}

    public record AddPaymentRequest(
            double amount,
            String method,
            String reference,
            Instant paidAt
    ) {}
}

