package rw.venus.geosmartmanager.service;

import rw.venus.geosmartmanager.api.dto.ProjectMessageDtos;
import rw.venus.geosmartmanager.domain.ProjectMessageVisibility;
import rw.venus.geosmartmanager.domain.UserRole;
import rw.venus.geosmartmanager.entity.ProjectEntity;
import rw.venus.geosmartmanager.entity.ProjectMessageEntity;
import rw.venus.geosmartmanager.entity.UserEntity;
import rw.venus.geosmartmanager.exception.ApiException;
import rw.venus.geosmartmanager.repo.ProjectMessageRepository;
import rw.venus.geosmartmanager.repo.ProjectRepository;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ProjectMessageService {
    private final ProjectRepository projectRepository;
    private final ProjectMessageRepository projectMessageRepository;
    private final ProjectAccessService projectAccessService;
    private final AuditService auditService;

    public ProjectMessageService(
            ProjectRepository projectRepository,
            ProjectMessageRepository projectMessageRepository,
            ProjectAccessService projectAccessService,
            AuditService auditService
    ) {
        this.projectRepository = projectRepository;
        this.projectMessageRepository = projectMessageRepository;
        this.projectAccessService = projectAccessService;
        this.auditService = auditService;
    }

    @Transactional(readOnly = true)
    public List<ProjectMessageDtos.MessageDto> list(UserEntity actor, UUID projectId) {
        projectAccessService.requireProjectRead(actor, projectId);
        List<ProjectMessageEntity> all = projectMessageRepository.findByProjectIdOrderByCreatedAtDesc(projectId);
        if (actor.getRole() == UserRole.CLIENT) {
            return all.stream()
                    .filter(m -> m.getVisibility() == ProjectMessageVisibility.CLIENT_VISIBLE)
                    .map(this::toDto)
                    .toList();
        }
        return all.stream().map(this::toDto).toList();
    }

    @Transactional
    public ProjectMessageDtos.MessageDto create(UserEntity actor, UUID projectId, ProjectMessageDtos.CreateMessageRequest req) {
        projectAccessService.requireProjectRead(actor, projectId);

        ProjectEntity project = projectRepository.findById(projectId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Project not found"));

        if (actor.getRole() == UserRole.CLIENT) {
            if (req.visibility() != ProjectMessageVisibility.CLIENT_VISIBLE) {
                throw new ApiException(HttpStatus.FORBIDDEN, "FORBIDDEN", "Clients can only post client-visible messages");
            }
        } else {
            projectAccessService.requireProjectWrite(actor, projectId);
        }

        ProjectMessageEntity msg = new ProjectMessageEntity();
        msg.setProject(project);
        msg.setActor(actor);
        msg.setVisibility(req.visibility());
        msg.setMessage(req.message());
        if (req.markerLat() != null || req.markerLon() != null) {
            if (req.markerLat() == null || req.markerLon() == null) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_MARKER", "Marker requires both latitude and longitude");
            }
            msg.setMarkerLat(req.markerLat());
            msg.setMarkerLon(req.markerLon());
        }
        ProjectMessageEntity saved = projectMessageRepository.save(msg);

        auditService.log(actor, "PROJECT_MESSAGE_CREATED", "ProjectMessage", saved.getId());
        return toDto(saved);
    }

    private ProjectMessageDtos.MessageDto toDto(ProjectMessageEntity m) {
        return new ProjectMessageDtos.MessageDto(
                m.getId(),
                m.getProject().getId(),
                m.getActor() == null ? null : m.getActor().getUsername(),
                m.getVisibility(),
                m.getMessage(),
                m.getMarkerLat(),
                m.getMarkerLon(),
                m.getCreatedAt()
        );
    }
}
