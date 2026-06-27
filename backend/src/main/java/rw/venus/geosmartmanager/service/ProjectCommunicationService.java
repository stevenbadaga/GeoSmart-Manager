package rw.venus.geosmartmanager.service;

import org.springframework.stereotype.Service;
import rw.venus.geosmartmanager.api.dto.ProjectRecordsDtos;
import rw.venus.geosmartmanager.entity.ProjectCommunicationEntity;
import rw.venus.geosmartmanager.entity.ProjectEntity;
import rw.venus.geosmartmanager.entity.UserEntity;
import rw.venus.geosmartmanager.domain.ProjectCommunicationChannel;
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
        UserEntity currentUser = currentUserService.getCurrentUser();
        String normalizedSummary = request.summary().trim();
        ProjectCommunicationEntity entity = ProjectCommunicationEntity.builder()
                .project(project)
                .channel(request.channel() != null ? request.channel() : ProjectCommunicationChannel.NOTE)
                .subject(normalizeOptional(request.subject()) != null ? normalizeOptional(request.subject()) : defaultSubject(normalizedSummary))
                .contactPerson(normalizeOptional(request.contactPerson()) != null
                        ? normalizeOptional(request.contactPerson())
                        : currentUser != null ? currentUser.getFullName() : null)
                .senderUserId(currentUser != null ? currentUser.getId() : null)
                .senderName(currentUser != null ? currentUser.getFullName() : "System")
                .senderRole(currentUser != null && currentUser.getRole() != null ? currentUser.getRole().name() : "SYSTEM")
                .summary(normalizedSummary)
                .systemGenerated(false)
                .occurredAt(request.occurredAt() != null ? request.occurredAt() : Instant.now())
                .createdAt(Instant.now())
                .build();
        projectCommunicationRepository.save(entity);
        auditService.log(currentUserService.getCurrentUserEmail(), "CREATE", "ProjectCommunication", entity.getId(), "Project communication recorded");
        return entity;
    }

    public List<ProjectCommunicationEntity> list(Long projectId) {
        projectService.getProject(projectId);
        return projectCommunicationRepository.findByProjectIdOrderByOccurredAtAscCreatedAtAsc(projectId);
    }

    private String defaultSubject(String summary) {
        if (summary == null || summary.isBlank()) {
            return "Project message";
        }
        String compact = summary.replaceAll("\\s+", " ").trim();
        if (compact.length() <= 42) {
            return compact;
        }
        return compact.substring(0, 42).trim() + "...";
    }

    private String normalizeOptional(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
