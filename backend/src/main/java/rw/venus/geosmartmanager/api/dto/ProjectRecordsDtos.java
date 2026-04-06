package rw.venus.geosmartmanager.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import rw.venus.geosmartmanager.domain.ProjectCommunicationChannel;
import rw.venus.geosmartmanager.domain.ProjectDocumentApprovalStatus;

import java.time.Instant;

public class ProjectRecordsDtos {
    public record ProjectDocumentRequest(
            @NotBlank String title,
            @NotBlank String category,
            @NotBlank String versionLabel,
            String fileReference,
            ProjectDocumentApprovalStatus approvalStatus,
            String notes
    ) {}

    public record ProjectDocumentResponse(
            Long id,
            Long projectId,
            String title,
            String category,
            String versionLabel,
            String fileReference,
            ProjectDocumentApprovalStatus approvalStatus,
            String notes,
            Instant createdAt
    ) {}

    public record ProjectCommunicationRequest(
            @NotNull ProjectCommunicationChannel channel,
            @NotBlank String subject,
            String contactPerson,
            @NotBlank String summary,
            Instant occurredAt
    ) {}

    public record ProjectCommunicationResponse(
            Long id,
            Long projectId,
            ProjectCommunicationChannel channel,
            String subject,
            String contactPerson,
            String summary,
            Instant occurredAt,
            Instant createdAt
    ) {}
}
