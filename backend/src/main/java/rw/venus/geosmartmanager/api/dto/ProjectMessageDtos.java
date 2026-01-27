package rw.venus.geosmartmanager.api.dto;

import rw.venus.geosmartmanager.domain.ProjectMessageVisibility;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.Instant;
import java.util.UUID;

public final class ProjectMessageDtos {
    private ProjectMessageDtos() {}

    public record MessageDto(
            UUID id,
            UUID projectId,
            String actorUsername,
            ProjectMessageVisibility visibility,
            String message,
            Double markerLat,
            Double markerLon,
            Instant createdAt
    ) {}

    public record CreateMessageRequest(
            @NotNull ProjectMessageVisibility visibility,
            @NotBlank String message,
            Double markerLat,
            Double markerLon
    ) {}
}
