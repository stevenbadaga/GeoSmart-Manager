package rw.venus.geosmartmanager.service;

import org.springframework.stereotype.Service;
import rw.venus.geosmartmanager.api.dto.ProjectDtos;
import rw.venus.geosmartmanager.domain.WorkflowStatus;
import rw.venus.geosmartmanager.entity.ClientEntity;
import rw.venus.geosmartmanager.entity.ProjectEntity;
import rw.venus.geosmartmanager.repo.ClientRepository;
import rw.venus.geosmartmanager.repo.ComplianceCheckRepository;
import rw.venus.geosmartmanager.repo.DatasetRepository;
import rw.venus.geosmartmanager.repo.ProjectCommunicationRepository;
import rw.venus.geosmartmanager.repo.ProjectDocumentRepository;
import rw.venus.geosmartmanager.repo.ProjectRepository;
import rw.venus.geosmartmanager.repo.ReportRepository;
import rw.venus.geosmartmanager.repo.SubdivisionRunRepository;
import rw.venus.geosmartmanager.repo.WorkflowTaskRepository;

import java.time.Instant;
import java.util.List;

@Service
public class ProjectService {
    private final ProjectRepository projectRepository;
    private final ClientRepository clientRepository;
    private final DatasetRepository datasetRepository;
    private final SubdivisionRunRepository subdivisionRunRepository;
    private final ComplianceCheckRepository complianceCheckRepository;
    private final ReportRepository reportRepository;
    private final WorkflowTaskRepository workflowTaskRepository;
    private final ProjectDocumentRepository projectDocumentRepository;
    private final ProjectCommunicationRepository projectCommunicationRepository;
    private final AuditService auditService;
    private final CurrentUserService currentUserService;

    public ProjectService(ProjectRepository projectRepository,
                          ClientRepository clientRepository,
                          DatasetRepository datasetRepository,
                          SubdivisionRunRepository subdivisionRunRepository,
                          ComplianceCheckRepository complianceCheckRepository,
                          ReportRepository reportRepository,
                          WorkflowTaskRepository workflowTaskRepository,
                          ProjectDocumentRepository projectDocumentRepository,
                          ProjectCommunicationRepository projectCommunicationRepository,
                          AuditService auditService,
                          CurrentUserService currentUserService) {
        this.projectRepository = projectRepository;
        this.clientRepository = clientRepository;
        this.datasetRepository = datasetRepository;
        this.subdivisionRunRepository = subdivisionRunRepository;
        this.complianceCheckRepository = complianceCheckRepository;
        this.reportRepository = reportRepository;
        this.workflowTaskRepository = workflowTaskRepository;
        this.projectDocumentRepository = projectDocumentRepository;
        this.projectCommunicationRepository = projectCommunicationRepository;
        this.auditService = auditService;
        this.currentUserService = currentUserService;
    }

    public ProjectEntity create(ProjectDtos.ProjectRequest request) {
        ClientEntity client = clientRepository.findById(request.clientId())
                .orElseThrow(() -> new IllegalArgumentException("Client not found"));
        ProjectEntity entity = ProjectEntity.builder()
                .code(request.code())
                .name(request.name())
                .projectType(normalizeOptional(request.projectType()))
                .locationSummary(normalizeOptional(request.locationSummary()))
                .scopeSummary(normalizeOptional(request.scopeSummary()))
                .description(request.description())
                .status(request.status())
                .startDate(request.startDate())
                .endDate(request.endDate())
                .client(client)
                .createdAt(Instant.now())
                .build();
        projectRepository.save(entity);
        auditService.log(currentUserService.getCurrentUserEmail(), "CREATE", "Project", entity.getId(), "Project created");
        return entity;
    }

    public List<ProjectEntity> list(boolean includeArchived) {
        return includeArchived ? projectRepository.findAll() : projectRepository.findByArchivedAtIsNull();
    }

    public ProjectEntity update(Long id, ProjectDtos.ProjectRequest request) {
        ProjectEntity entity = projectRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Project not found"));
        ClientEntity client = clientRepository.findById(request.clientId())
                .orElseThrow(() -> new IllegalArgumentException("Client not found"));
        entity.setCode(request.code());
        entity.setName(request.name());
        entity.setProjectType(normalizeOptional(request.projectType()));
        entity.setLocationSummary(normalizeOptional(request.locationSummary()));
        entity.setScopeSummary(normalizeOptional(request.scopeSummary()));
        entity.setDescription(request.description());
        entity.setStatus(request.status());
        entity.setStartDate(request.startDate());
        entity.setEndDate(request.endDate());
        entity.setClient(client);
        projectRepository.save(entity);
        auditService.log(currentUserService.getCurrentUserEmail(), "UPDATE", "Project", entity.getId(), "Project updated");
        return entity;
    }

    public ProjectEntity archive(Long id) {
        ProjectEntity entity = getProject(id);
        if (entity.getArchivedAt() == null) {
            entity.setArchivedAt(Instant.now());
            projectRepository.save(entity);
            auditService.log(currentUserService.getCurrentUserEmail(), "ARCHIVE", "Project", entity.getId(), "Project archived");
        }
        return entity;
    }

    public ProjectEntity restore(Long id) {
        ProjectEntity entity = getProject(id);
        if (entity.getArchivedAt() != null) {
            entity.setArchivedAt(null);
            projectRepository.save(entity);
            auditService.log(currentUserService.getCurrentUserEmail(), "RESTORE", "Project", entity.getId(), "Project restored");
        }
        return entity;
    }

    public void delete(Long id) {
        projectRepository.deleteById(id);
        auditService.log(currentUserService.getCurrentUserEmail(), "DELETE", "Project", id, "Project deleted");
    }

    public ProjectEntity getProject(Long id) {
        return projectRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Project not found"));
    }

    public ProjectEntity getActiveProject(Long id) {
        ProjectEntity project = getProject(id);
        if (project.getArchivedAt() != null) {
            throw new IllegalArgumentException("Project is archived. Restore it before adding new records.");
        }
        return project;
    }

    public long documentCount(Long projectId) {
        return projectDocumentRepository.countByProjectId(projectId);
    }

    public long communicationCount(Long projectId) {
        return projectCommunicationRepository.countByProjectId(projectId);
    }

    public ProjectWorkflowSnapshot workflowSnapshot(Long projectId) {
        ProjectEntity project = getProject(projectId);
        if (project.getArchivedAt() != null) {
            return new ProjectWorkflowSnapshot("ARCHIVED", "Restore project to resume delivery", 100);
        }
        long datasetCount = datasetRepository.countByProjectId(projectId);
        long subdivisionCount = subdivisionRunRepository.countByProjectId(projectId);
        long complianceCount = complianceCheckRepository.countByProjectId(projectId);
        long reportCount = reportRepository.countByProjectId(projectId);
        long openTasks = workflowTaskRepository.countByProjectIdAndStatusNot(projectId, WorkflowStatus.DONE);

        int completedSteps = 1;
        if (datasetCount > 0) completedSteps += 1;
        if (subdivisionCount > 0) completedSteps += 1;
        if (complianceCount > 0) completedSteps += 1;
        if (reportCount > 0) completedSteps += 1;
        int readinessPercent = (int) Math.round((completedSteps / 5.0) * 100.0);

        if (datasetCount == 0) {
            return new ProjectWorkflowSnapshot("DATA_PREPARATION", "Upload cadastral or UPI dataset", readinessPercent);
        }
        if (subdivisionCount == 0) {
            return new ProjectWorkflowSnapshot("SUBDIVISION_PENDING", "Run AI subdivision", readinessPercent);
        }
        if (complianceCount == 0) {
            return new ProjectWorkflowSnapshot("COMPLIANCE_PENDING", "Run compliance validation", readinessPercent);
        }
        if (reportCount == 0) {
            return new ProjectWorkflowSnapshot("REPORT_PENDING", "Generate project report", readinessPercent);
        }
        if (openTasks > 0) {
            return new ProjectWorkflowSnapshot("WORKFLOW_CLOSURE", "Close " + openTasks + " remaining workflow task(s)", readinessPercent);
        }
        return new ProjectWorkflowSnapshot("READY_FOR_SUBMISSION", "Ready for client and regulator submission", 100);
    }

    public record ProjectWorkflowSnapshot(
            String stage,
            String nextAction,
            int readinessPercent
    ) {}

    private String normalizeOptional(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
