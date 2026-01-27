package rw.venus.geosmartmanager.api.dto;

import rw.venus.geosmartmanager.domain.ProjectDocumentType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.Instant;
import java.util.UUID;

public final class ProjectDocumentDtos {
    private ProjectDocumentDtos() {}

    public record DocumentDto(
            UUID id,
            UUID projectId,
            ProjectDocumentType docType,
            String name,
            String originalFilename,
            String contentType,
            long sizeBytes,
            String checksumSha256,
            String uploadedByUsername,
            Instant uploadedAt
    ) {}

    public record UploadDocumentMetadata(
            @NotBlank String name,
            @NotNull ProjectDocumentType docType
    ) {}
}

