package rw.venus.geosmartmanager.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import rw.venus.geosmartmanager.domain.ProjectStatus;

import java.time.LocalDate;

public class ProjectDtos {
    public record ProjectRequest(
            @NotBlank String code,
            @NotBlank String name,
            String projectType,
            String locationSummary,
            String scopeSummary,
            String description,
            @NotNull ProjectStatus status,
            LocalDate startDate,
            LocalDate endDate,
            @NotNull Long clientId
    ) {}

    public record ProjectResponse(
            Long id,
            String code,
            String name,
            String projectType,
            String locationSummary,
            String scopeSummary,
            String description,
            ProjectStatus status,
            LocalDate startDate,
            LocalDate endDate,
            Long clientId,
            String clientName,
            boolean archived,
            java.time.Instant archivedAt,
            long documentCount,
            long communicationCount,
            String workflowStage,
            String nextAction,
            int readinessPercent
    ) {}
}
