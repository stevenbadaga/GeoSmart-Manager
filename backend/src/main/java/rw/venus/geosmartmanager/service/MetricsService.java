package rw.venus.geosmartmanager.service;

import org.springframework.stereotype.Service;
import rw.venus.geosmartmanager.api.dto.MetricsDtos;
import rw.venus.geosmartmanager.config.AppProperties;
import rw.venus.geosmartmanager.domain.ComplianceStatus;
import rw.venus.geosmartmanager.domain.ProjectStatus;
import rw.venus.geosmartmanager.domain.UserStatus;
import rw.venus.geosmartmanager.domain.WorkflowStatus;
import rw.venus.geosmartmanager.repo.ComplianceCheckRepository;
import rw.venus.geosmartmanager.repo.DatasetRepository;
import rw.venus.geosmartmanager.repo.ProjectRepository;
import rw.venus.geosmartmanager.repo.ReportRepository;
import rw.venus.geosmartmanager.repo.SubdivisionRunRepository;
import rw.venus.geosmartmanager.repo.UserRepository;
import rw.venus.geosmartmanager.repo.WorkflowTaskRepository;
import rw.venus.geosmartmanager.repo.AuditLogRepository;

import java.lang.management.ManagementFactory;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;

@Service
public class MetricsService {
    private final ProjectRepository projectRepository;
    private final UserRepository userRepository;
    private final ComplianceCheckRepository complianceCheckRepository;
    private final DatasetRepository datasetRepository;
    private final ReportRepository reportRepository;
    private final SubdivisionRunRepository subdivisionRunRepository;
    private final AuditLogRepository auditLogRepository;
    private final WorkflowTaskRepository workflowTaskRepository;
    private final AppProperties appProperties;

    public MetricsService(ProjectRepository projectRepository,
                          UserRepository userRepository,
                          ComplianceCheckRepository complianceCheckRepository,
                          DatasetRepository datasetRepository,
                          ReportRepository reportRepository,
                          SubdivisionRunRepository subdivisionRunRepository,
                          AuditLogRepository auditLogRepository,
                          WorkflowTaskRepository workflowTaskRepository,
                          AppProperties appProperties) {
        this.projectRepository = projectRepository;
        this.userRepository = userRepository;
        this.complianceCheckRepository = complianceCheckRepository;
        this.datasetRepository = datasetRepository;
        this.reportRepository = reportRepository;
        this.subdivisionRunRepository = subdivisionRunRepository;
        this.auditLogRepository = auditLogRepository;
        this.workflowTaskRepository = workflowTaskRepository;
        this.appProperties = appProperties;
    }

    public MetricsDtos.OverviewResponse overview() {
        long totalProjects = projectRepository.count();
        long completedProjects = projectRepository.countByStatus(ProjectStatus.COMPLETED);
        long activeProjects = projectRepository.countByStatusNot(ProjectStatus.COMPLETED);
        long fieldWorkProjects = projectRepository.countByStatus(ProjectStatus.IN_PROGRESS);
        long pendingComplianceProjects = projectRepository.countByStatus(ProjectStatus.REVIEW);

        long totalUsers = userRepository.count();
        long activeUsers = userRepository.countByStatus(UserStatus.ACTIVE);

        Instant todayStart = LocalDate.now(ZoneId.of("Africa/Kigali")).atStartOfDay(ZoneId.of("Africa/Kigali")).toInstant();
        Instant monthStart = LocalDate.now(ZoneId.of("Africa/Kigali")).withDayOfMonth(1).atStartOfDay(ZoneId.of("Africa/Kigali")).toInstant();
        long usersCreatedToday = userRepository.countByCreatedAtAfter(todayStart);
        long projectsCreatedThisMonth = projectRepository.countByCreatedAtAfter(monthStart);

        long complianceCritical = complianceCheckRepository.countByStatus(ComplianceStatus.FAIL);
        long complianceWarnings = complianceCheckRepository.countByStatus(ComplianceStatus.WARN);
        long complianceAlerts = complianceCritical + complianceWarnings;

        long workflowBacklog = workflowTaskRepository.countByStatusNot(WorkflowStatus.DONE);
        long workflowTotal = workflowTaskRepository.count();

        long datasetSize = datasetRepository.sumGeoJsonSize();
        long subdivisionSize = subdivisionRunRepository.sumResultGeoJsonSize();
        long reportSize = reportRepository.sumReportContentSize();
        long complianceSize = complianceCheckRepository.sumFindingsSize();
        long auditSize = auditLogRepository.sumDetailsSize();
        long storageUsedBytes = datasetSize + subdivisionSize + reportSize + complianceSize + auditSize;
        double storageUsedMb = storageUsedBytes / (1024.0 * 1024.0);
        double storageCapacityMb = appProperties.getMetrics().getStorageCapacityMb();
        double storagePercent = storageCapacityMb > 0 ? Math.min(100, (storageUsedMb / storageCapacityMb) * 100) : 0;

        double serverLoadPercent = computeServerLoadPercent();

        return new MetricsDtos.OverviewResponse(
                totalProjects,
                activeProjects,
                fieldWorkProjects,
                pendingComplianceProjects,
                completedProjects,
                totalUsers,
                activeUsers,
                usersCreatedToday,
                projectsCreatedThisMonth,
                complianceAlerts,
                complianceCritical,
                workflowBacklog,
                workflowTotal,
                storageUsedBytes,
                storageUsedMb,
                storageCapacityMb,
                storagePercent,
                serverLoadPercent
        );
    }

    private double computeServerLoadPercent() {
        java.lang.management.OperatingSystemMXBean os = ManagementFactory.getOperatingSystemMXBean();
        double percent = 0;
        if (os instanceof com.sun.management.OperatingSystemMXBean sun) {
            double load = sun.getSystemCpuLoad();
            if (load >= 0) {
                percent = load * 100;
            }
        }
        if (percent <= 0) {
            double loadAvg = os.getSystemLoadAverage();
            if (loadAvg > 0 && os.getAvailableProcessors() > 0) {
                percent = (loadAvg / os.getAvailableProcessors()) * 100;
            }
        }
        if (Double.isNaN(percent) || Double.isInfinite(percent)) {
            return 0;
        }
        return Math.max(0, Math.min(100, percent));
    }
}
