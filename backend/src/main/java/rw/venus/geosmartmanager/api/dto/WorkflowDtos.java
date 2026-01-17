package rw.venus.geosmartmanager.api.dto;

import rw.venus.geosmartmanager.domain.TaskStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.Instant;
import java.util.UUID;

public final class WorkflowDtos {
    private WorkflowDtos() {}

    public record TaskDto(
            UUID id,
            UUID projectId,
            String title,
            String description,
            TaskStatus status,
            UUID assignedToUserId,
            String assignedToUsername,
            Instant dueAt,
            Instant createdAt,
            Instant updatedAt
    ) {}

    public record CreateTaskRequest(
            @NotBlank String title,
            String description,
            TaskStatus status,
            UUID assignedToUserId,
            Instant dueAt
    ) {}

    public record UpdateTaskRequest(
            @NotBlank String title,
            String description,
            @NotNull TaskStatus status,
            UUID assignedToUserId,
            Instant dueAt
    ) {}

    public record AssignableUserDto(
            @NotNull UUID id,
            @NotBlank String username,
            String role
    ) {}
}
