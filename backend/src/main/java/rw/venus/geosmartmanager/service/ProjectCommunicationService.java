package rw.venus.geosmartmanager.service;

import org.springframework.stereotype.Service;
import rw.venus.geosmartmanager.api.dto.ProjectRecordsDtos;
import rw.venus.geosmartmanager.entity.ProjectCommunicationEntity;
import rw.venus.geosmartmanager.entity.ProjectEntity;
import rw.venus.geosmartmanager.repo.ProjectCommunicationRepository;

import java.time.Instant;
import java.util.List;

@Service
public class ProjectCommunicationService {
    private final ProjectCommunicationRepository projectCommunicationRepository;
    private final ProjectService projectService;
    private final AuditService auditService;
    private final CurrentUserService currentUserService;

    public ProjectCommunicationService(ProjectCommunicationRepository projectCommunicationRepository,
                                       ProjectService projectService,
                                       AuditService auditService,
                                       CurrentUserService currentUserService) {
        this.projectCommunicationRepository = projectCommunicationRepository;
        this.projectService = projectService;
        this.auditService = auditService;
        this.currentUserService = currentUserService;
    }

    public ProjectCommunicationEntity create(Long projectId, ProjectRecordsDtos.ProjectCommunicationRequest request) {
        ProjectEntity project = projectService.getActiveProject(projectId);
        ProjectCommunicationEntity entity = ProjectCommunicationEntity.builder()
                .project(project)
                .channel(request.channel())
                .subject(request.subject())
                .contactPerson(normalizeOptional(request.contactPerson()))
                .summary(request.summary())
                .occurredAt(request.occurredAt() != null ? request.occurredAt() : Instant.now())
                .createdAt(Instant.now())
                .build();
        projectCommunicationRepository.save(entity);
        auditService.log(currentUserService.getCurrentUserEmail(), "CREATE", "ProjectCommunication", entity.getId(), "Project communication recorded");
        return entity;
    }

    public List<ProjectCommunicationEntity> list(Long projectId) {
        projectService.getProject(projectId);
        return projectCommunicationRepository.findByProjectIdOrderByOccurredAtDescCreatedAtDesc(projectId);
    }

    private String normalizeOptional(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
