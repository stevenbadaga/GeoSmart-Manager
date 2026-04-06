package rw.venus.geosmartmanager.service;

import org.springframework.stereotype.Service;
import rw.venus.geosmartmanager.api.dto.ProjectRecordsDtos;
import rw.venus.geosmartmanager.domain.ProjectDocumentApprovalStatus;
import rw.venus.geosmartmanager.entity.ProjectDocumentEntity;
import rw.venus.geosmartmanager.entity.ProjectEntity;
import rw.venus.geosmartmanager.repo.ProjectDocumentRepository;

import java.time.Instant;
import java.util.List;

@Service
public class ProjectDocumentService {
    private final ProjectDocumentRepository projectDocumentRepository;
    private final ProjectService projectService;
    private final AuditService auditService;
    private final CurrentUserService currentUserService;

    public ProjectDocumentService(ProjectDocumentRepository projectDocumentRepository,
                                  ProjectService projectService,
                                  AuditService auditService,
                                  CurrentUserService currentUserService) {
        this.projectDocumentRepository = projectDocumentRepository;
        this.projectService = projectService;
        this.auditService = auditService;
        this.currentUserService = currentUserService;
    }

    public ProjectDocumentEntity create(Long projectId, ProjectRecordsDtos.ProjectDocumentRequest request) {
        ProjectEntity project = projectService.getActiveProject(projectId);
        ProjectDocumentEntity entity = ProjectDocumentEntity.builder()
                .project(project)
                .title(request.title())
                .category(request.category())
                .versionLabel(request.versionLabel())
                .fileReference(normalizeOptional(request.fileReference()))
                .approvalStatus(request.approvalStatus() != null ? request.approvalStatus() : ProjectDocumentApprovalStatus.DRAFT)
                .notes(normalizeOptional(request.notes()))
                .createdAt(Instant.now())
                .build();
        projectDocumentRepository.save(entity);
        auditService.log(currentUserService.getCurrentUserEmail(), "CREATE", "ProjectDocument", entity.getId(), "Project document recorded");
        return entity;
    }

    public List<ProjectDocumentEntity> list(Long projectId) {
        projectService.getProject(projectId);
        return projectDocumentRepository.findByProjectIdOrderByCreatedAtDesc(projectId);
    }

    private String normalizeOptional(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
