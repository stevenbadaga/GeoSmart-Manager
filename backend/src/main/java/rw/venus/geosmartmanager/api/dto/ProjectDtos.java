package rw.venus.geosmartmanager.api.dto;

import jakarta.validation.constraints.NotBlank;
import rw.venus.geosmartmanager.api.dto.PlannerDtos;
import rw.venus.geosmartmanager.domain.ProjectStatus;

import java.time.Instant;
import java.time.LocalDate;

public class ProjectDtos {
    public record ProjectRequest(
            String code,
            @NotBlank String name,
            String projectType,
            String locationSummary,
            String scopeSummary,
            String description,
            ProjectStatus status,
            LocalDate startDate,
            LocalDate endDate,
            Long clientId,
            String requestedUpi,
            Integer requestedParcelCount,
            String requestedLandUse,
            String intakeNotes
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
            Instant archivedAt,
            long documentCount,
            long communicationCount,
            String workflowStage,
            String nextAction,
            int readinessPercent,
            Long assignedSurveyorId,
            String assignedSurveyorName,
            String requestedUpi,
            Integer requestedParcelCount,
            String requestedLandUse,
            String intakeNotes,
            Instant approvedAt,
            Instant surveyorAcceptedAt,
            Instant subdivisionDraftedAt,
            Instant complianceCheckedAt,
            Instant reportReadyAt
    ) {}

    public record AssignmentRequest(
            Long surveyorId
    ) {}

    public record WorkflowDraftRequest(
            Integer actualParcelCount,
            String proposedLandUse
    ) {}

    public record WorkflowComplianceRequest(
            Integer complianceScore,
            String recommendation
    ) {}

    public record ProjectPlannerReportResponse(
            Long projectId,
            Long reportId,
            String createdAt,
            String reportMarkdown,
            PlannerDtos.SubdivisionCheckResponse report
    ) {}

}
