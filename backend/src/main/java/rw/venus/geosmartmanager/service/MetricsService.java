package rw.venus.geosmartmanager.service;

import jakarta.annotation.PostConstruct;
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
import rw.venus.geosmartmanager.repo.ClientRepository;
import rw.venus.geosmartmanager.repository.ContactMessageRepository;

import java.lang.management.ManagementFactory;
import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;

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
    private final ContactMessageRepository contactMessageRepository;
    private final ClientRepository clientRepository;
    private final AppProperties appProperties;
    private Path sqlitePath;
    private boolean sqliteAvailable;

    public MetricsService(ProjectRepository projectRepository,
                          UserRepository userRepository,
                          ComplianceCheckRepository complianceCheckRepository,
                          DatasetRepository datasetRepository,
                          ReportRepository reportRepository,
                          SubdivisionRunRepository subdivisionRunRepository,
                          AuditLogRepository auditLogRepository,
                          WorkflowTaskRepository workflowTaskRepository,
                          ContactMessageRepository contactMessageRepository,
                          ClientRepository clientRepository,
                          AppProperties appProperties) {
        this.projectRepository = projectRepository;
        this.userRepository = userRepository;
        this.complianceCheckRepository = complianceCheckRepository;
        this.datasetRepository = datasetRepository;
        this.reportRepository = reportRepository;
        this.subdivisionRunRepository = subdivisionRunRepository;
        this.auditLogRepository = auditLogRepository;
        this.workflowTaskRepository = workflowTaskRepository;
        this.contactMessageRepository = contactMessageRepository;
        this.clientRepository = clientRepository;
        this.appProperties = appProperties;
    }

    @PostConstruct
    void init() {
        this.sqlitePath = Path.of(System.getProperty("user.dir"), "data", "geosmart_gis.sqlite").toAbsolutePath();
        this.sqliteAvailable = Files.exists(sqlitePath);
        if (!sqliteAvailable) {
            return;
        }
        try {
            Class.forName("org.sqlite.JDBC");
        } catch (ClassNotFoundException ex) {
            sqliteAvailable = false;
        }
    }

    public MetricsDtos.OverviewResponse overview(rw.venus.geosmartmanager.entity.UserEntity user) {
        long totalProjects = projectRepository.count();
        long completedProjects = projectRepository.countByStatus(ProjectStatus.COMPLETED);
        long activeProjects = projectRepository.countByStatusNot(ProjectStatus.COMPLETED);
        long fieldWorkProjects = projectRepository.countByStatus(ProjectStatus.UNDER_REVIEW);
        long pendingComplianceProjects = projectRepository.countByStatus(ProjectStatus.SUBDIVISION_REVIEW);

        long totalUsers = userRepository.count();
        long activeUsers = userRepository.countByStatus(UserStatus.ACTIVE);

        Instant todayStart = LocalDate.now(ZoneId.of("Africa/Kigali")).atStartOfDay(ZoneId.of("Africa/Kigali")).toInstant();
        Instant monthStart = LocalDate.now(ZoneId.of("Africa/Kigali")).withDayOfMonth(1).atStartOfDay(ZoneId.of("Africa/Kigali")).toInstant();
        PlannerActivityMetrics plannerActivity = readPlannerActivity(todayStart);
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

        // Role specific
        long totalClients = userRepository.countByRole(rw.venus.geosmartmanager.domain.Role.CLIENT);
        long totalSurveyors = userRepository.countByRole(rw.venus.geosmartmanager.domain.Role.SURVEYOR);
        long projectsPendingAssignment = projectRepository.countByStatus(ProjectStatus.PENDING_ASSIGNMENT);
        long projectsUnderReview = projectRepository.countByStatus(ProjectStatus.UNDER_REVIEW);
        long projectsSubdivisionReview = projectRepository.countByStatus(ProjectStatus.SUBDIVISION_REVIEW);
        long newContactMessages = contactMessageRepository.countAllByStatus("NEW");

        long assignedProjectsCount = projectRepository.countByAssignedSurveyorId(user.getId());
        long pendingReviewsCount = projectRepository.countByAssignedSurveyorIdAndStatus(user.getId(), ProjectStatus.ASSIGNED);
        long activeSubdivisionReviewsCount = projectRepository.countByAssignedSurveyorIdAndStatus(user.getId(), ProjectStatus.SUBDIVISION_REVIEW);
        long surveyorReportsGeneratedCount = reportRepository.countByGeneratedBy(user);
        long reportsThisMonthCount = reportRepository.countByGeneratedByAndCreatedAtAfter(user, monthStart);

        long myProjectsCount = 0;
        long myReportsCount = 0;
        if (user.getRole() == rw.venus.geosmartmanager.domain.Role.CLIENT) {
            clientRepository.findByUserId(user.getId()).ifPresent(c -> {
                long cId = c.getId();
                // We use long internally but the repo uses the same.
                // Re-calculating counts for this client
                // Note: Repo needs findByClientId or similar if we want to be precise.
                // Existing repo has findByClientId(Long clientId)
                // Metrics will show total projects for this specific client entity.
            });
            // Simplified for now: assume myProjectsCount is projects where client_id links to the client entity linked to this user.
            var clientOpt = clientRepository.findByUserId(user.getId());
            if (clientOpt.isPresent()) {
                Long clientId = clientOpt.get().getId();
                myProjectsCount = projectRepository.countByClientId(clientId);
                List<Long> pIds = projectRepository.findByClientId(clientId).stream().map(rw.venus.geosmartmanager.entity.ProjectEntity::getId).toList();
                if (!pIds.isEmpty()) {
                    myReportsCount = reportRepository.countByProjectIdIn(pIds);
                }
            }
        }

        List<MetricsDtos.ActivityDto> latestActivities = auditLogRepository.findTop5ByOrderByCreatedAtDesc().stream()
                .map(a -> new MetricsDtos.ActivityDto(a.getAction() + " " + a.getEntityType(), a.getCreatedAt()))
                .toList();

        return new MetricsDtos.OverviewResponse(
                totalProjects,
                activeProjects,
                fieldWorkProjects,
                pendingComplianceProjects,
                completedProjects,
                plannerActivity.proposalTotal(),
                plannerActivity.proposalsToday(),
                plannerActivity.reportTotal(),
                plannerActivity.reportsToday(),
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
                serverLoadPercent,
                totalClients,
                totalSurveyors,
                projectsPendingAssignment,
                projectsUnderReview,
                projectsSubdivisionReview,
                newContactMessages,
                assignedProjectsCount,
                pendingReviewsCount,
                activeSubdivisionReviewsCount,
                surveyorReportsGeneratedCount,
                reportsThisMonthCount,
                myProjectsCount,
                myReportsCount,
                latestActivities
        );
    }

    private PlannerActivityMetrics readPlannerActivity(Instant todayStart) {
        if (!sqliteAvailable) {
            return PlannerActivityMetrics.EMPTY;
        }

        String sql = """
                SELECT
                    (SELECT COUNT(*) FROM subdivision_proposals) AS proposal_total,
                    (SELECT COUNT(*) FROM subdivision_proposals WHERE created_at >= ?) AS proposals_today,
                    (SELECT COUNT(*) FROM compliance_reports) AS report_total,
                    (SELECT COUNT(*) FROM compliance_reports WHERE created_at >= ?) AS reports_today
                """;

        try (Connection connection = DriverManager.getConnection("jdbc:sqlite:" + sqlitePath);
             PreparedStatement statement = connection.prepareStatement(sql)) {
            String threshold = todayStart.toString();
            statement.setString(1, threshold);
            statement.setString(2, threshold);
            try (ResultSet resultSet = statement.executeQuery()) {
                if (!resultSet.next()) {
                    return PlannerActivityMetrics.EMPTY;
                }
                return new PlannerActivityMetrics(
                        resultSet.getLong("proposal_total"),
                        resultSet.getLong("proposals_today"),
                        resultSet.getLong("report_total"),
                        resultSet.getLong("reports_today")
                );
            }
        } catch (SQLException ex) {
            return PlannerActivityMetrics.EMPTY;
        }
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

    private record PlannerActivityMetrics(
            long proposalTotal,
            long proposalsToday,
            long reportTotal,
            long reportsToday
    ) {
        private static final PlannerActivityMetrics EMPTY = new PlannerActivityMetrics(0, 0, 0, 0);
    }
}
