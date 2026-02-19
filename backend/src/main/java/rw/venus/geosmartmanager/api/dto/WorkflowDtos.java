package rw.venus.geosmartmanager.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import rw.venus.geosmartmanager.domain.WorkflowStatus;

import java.time.LocalDate;

public class WorkflowDtos {
    public record WorkflowTaskRequest(
            @NotBlank String title,
            String description,
            String assigneeEmail,
            LocalDate dueDate
    ) {}

    public record UpdateStatusRequest(
            @NotNull WorkflowStatus status
    ) {}

    public record WorkflowTaskResponse(
            Long id,
            Long projectId,
            String title,
            String description,
            WorkflowStatus status,
            String assigneeEmail,
            LocalDate dueDate
    ) {}
}
