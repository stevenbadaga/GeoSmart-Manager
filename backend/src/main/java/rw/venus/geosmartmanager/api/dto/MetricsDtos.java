package rw.venus.geosmartmanager.api.dto;

public class MetricsDtos {
    public record OverviewResponse(
            long totalProjects,
            long activeProjects,
            long fieldWorkProjects,
            long pendingComplianceProjects,
            long completedProjects,
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
            double serverLoadPercent
    ) {}
}
