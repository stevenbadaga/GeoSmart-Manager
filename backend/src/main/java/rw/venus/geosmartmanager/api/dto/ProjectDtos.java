package rw.venus.geosmartmanager.api.dto;

import rw.venus.geosmartmanager.domain.ProjectStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.Instant;
import java.util.UUID;

public final class ProjectDtos {
    private ProjectDtos() {}

    public record ProjectDto(
            UUID id,
            UUID clientId,
            String clientName,
            String name,
            String description,
            ProjectStatus status,
            Instant createdAt
    ) {}

    public record CreateProjectRequest(
            @NotNull UUID clientId,
            @NotBlank String name,
            String description
    ) {}

    public record UpdateProjectRequest(
            @NotBlank String name,
            String description,
            @NotNull ProjectStatus status
    ) {}
}

