package rw.venus.geosmartmanager.service;

import rw.venus.geosmartmanager.api.dto.ProjectDtos;
import rw.venus.geosmartmanager.entity.ClientEntity;
import rw.venus.geosmartmanager.entity.ProjectEntity;
import rw.venus.geosmartmanager.entity.UserEntity;
import rw.venus.geosmartmanager.exception.ApiException;
import rw.venus.geosmartmanager.repo.ClientRepository;
import rw.venus.geosmartmanager.repo.ProjectRepository;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ProjectService {
    private final ProjectRepository projectRepository;
    private final ClientRepository clientRepository;
    private final AuditService auditService;

    public ProjectService(ProjectRepository projectRepository, ClientRepository clientRepository, AuditService auditService) {
        this.projectRepository = projectRepository;
        this.clientRepository = clientRepository;
        this.auditService = auditService;
    }

    @Transactional(readOnly = true)
    public List<ProjectDtos.ProjectDto> list(UUID clientId) {
        List<ProjectEntity> projects = clientId == null
                ? projectRepository.findAll()
                : projectRepository.findByClientId(clientId);
        return projects.stream().map(this::toDto).toList();
    }

    @Transactional(readOnly = true)
    public ProjectDtos.ProjectDto get(UUID id) {
        return toDto(projectRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Project not found")));
    }

    @Transactional
    public ProjectDtos.ProjectDto create(UserEntity actor, ProjectDtos.CreateProjectRequest req) {
        ClientEntity client = clientRepository.findById(req.clientId())
                .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "INVALID_CLIENT", "Client not found"));

        ProjectEntity project = new ProjectEntity();
        project.setClient(client);
        project.setName(req.name());
        project.setDescription(req.description());
        ProjectEntity saved = projectRepository.save(project);

        auditService.log(actor, "PROJECT_CREATED", "Project", saved.getId());
        return toDto(saved);
    }

    @Transactional
    public ProjectDtos.ProjectDto update(UserEntity actor, UUID id, ProjectDtos.UpdateProjectRequest req) {
        ProjectEntity project = projectRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Project not found"));
        project.setName(req.name());
        project.setDescription(req.description());
        project.setStatus(req.status());
        ProjectEntity saved = projectRepository.save(project);
        auditService.log(actor, "PROJECT_UPDATED", "Project", saved.getId());
        return toDto(saved);
    }

    private ProjectDtos.ProjectDto toDto(ProjectEntity p) {
        return new ProjectDtos.ProjectDto(
                p.getId(),
                p.getClient().getId(),
                p.getClient().getName(),
                p.getName(),
                p.getDescription(),
                p.getStatus(),
                p.getCreatedAt()
        );
    }
}
