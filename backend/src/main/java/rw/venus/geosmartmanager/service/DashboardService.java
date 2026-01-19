package rw.venus.geosmartmanager.service;

import rw.venus.geosmartmanager.domain.UserRole;
import rw.venus.geosmartmanager.entity.UserEntity;
import rw.venus.geosmartmanager.repo.ClientRepository;
import rw.venus.geosmartmanager.repo.ComplianceCheckRepository;
import rw.venus.geosmartmanager.repo.DatasetRepository;
import rw.venus.geosmartmanager.repo.ProjectRepository;
import rw.venus.geosmartmanager.repo.ReportRepository;
import rw.venus.geosmartmanager.repo.SubdivisionRunRepository;
import rw.venus.geosmartmanager.repo.WorkflowTaskRepository;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;

@Service
public class DashboardService {
    public record Summary(
            long clients,
            long projects,
            long datasets,
            long tasks,
            long subdivisionRuns,
            long complianceChecks,
            long reports
    ) {}

    private final ClientRepository clientRepository;
    private final ProjectRepository projectRepository;
    private final DatasetRepository datasetRepository;
    private final WorkflowTaskRepository workflowTaskRepository;
    private final SubdivisionRunRepository subdivisionRunRepository;
    private final ComplianceCheckRepository complianceCheckRepository;
    private final ReportRepository reportRepository;

    public DashboardService(
            ClientRepository clientRepository,
            ProjectRepository projectRepository,
            DatasetRepository datasetRepository,
            WorkflowTaskRepository workflowTaskRepository,
            SubdivisionRunRepository subdivisionRunRepository,
            ComplianceCheckRepository complianceCheckRepository,
            ReportRepository reportRepository
    ) {
        this.clientRepository = clientRepository;
        this.projectRepository = projectRepository;
        this.datasetRepository = datasetRepository;
        this.workflowTaskRepository = workflowTaskRepository;
        this.subdivisionRunRepository = subdivisionRunRepository;
        this.complianceCheckRepository = complianceCheckRepository;
        this.reportRepository = reportRepository;
    }

    public Summary summary(UserEntity actor) {
        if (actor.getRole() == UserRole.ADMIN) {
            return new Summary(
                    clientRepository.count(),
                    projectRepository.count(),
                    datasetRepository.count(),
                    workflowTaskRepository.count(),
                    subdivisionRunRepository.count(),
                    complianceCheckRepository.count(),
                    reportRepository.count()
            );
        }

        List<UUID> projectIds = projectRepository.findAccessibleProjectIds(actor.getId());
        if (projectIds.isEmpty()) {
            return new Summary(0, 0, 0, 0, 0, 0, 0);
        }

        return new Summary(
                projectRepository.countAccessibleClients(actor.getId()),
                projectIds.size(),
                datasetRepository.countByProjectIdIn(projectIds),
                workflowTaskRepository.countByProjectIdIn(projectIds),
                subdivisionRunRepository.countByProjectIdIn(projectIds),
                complianceCheckRepository.countByProjectIdIn(projectIds),
                reportRepository.countByProjectIdIn(projectIds)
        );
    }
}
