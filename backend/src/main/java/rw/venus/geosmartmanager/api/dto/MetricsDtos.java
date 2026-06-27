package rw.venus.geosmartmanager.api.dto;

import java.time.Instant;

public class MetricsDtos {
    public record OverviewResponse(
            long totalProjects,
            long activeProjects,
            long fieldWorkProjects,
            long pendingComplianceProjects,
            long completedProjects,
            long plannerProposalTotal,
            long plannerProposalsToday,
            long plannerReportTotal,
            long plannerReportsToday,
            long totalUsers,
            long activeUsers,
            long usersCreatedToday,
            long projectsCreatedThisMonth,
            long complianceAlerts,
            long complianceCritical,
            long workflowBacklog,
            long workflowTotal,
            long storageUsedBytes,
            double storageUsedMb,
            double storageCapacityMb,
            double storagePercent,
            double serverLoadPercent,
            // New Dashboard Metrics
            long totalClients,
            long totalSurveyors,
            long projectsPendingAssignment,
            long projectsUnderReview,
            long projectsSubdivisionReview,
            long newContactMessages,
            long assignedProjects,
            long pendingReviews,
            long activeSubdivisionReviews,
            long surveyorReportsGenerated,
            long reportsThisMonth,
            long myProjectsCount,
            long myReportsCount,
            java.util.List<ActivityDto> latestActivities
    ) {}

    public record ActivityDto(String description, Instant timestamp) {}
}
