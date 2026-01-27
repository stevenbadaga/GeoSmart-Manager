package rw.venus.geosmartmanager.service;

import rw.venus.geosmartmanager.api.dto.ProjectDtos;
import rw.venus.geosmartmanager.domain.ProjectMemberRole;
import rw.venus.geosmartmanager.domain.UserRole;
import rw.venus.geosmartmanager.entity.ClientEntity;
import rw.venus.geosmartmanager.entity.ProjectMemberEntity;
import rw.venus.geosmartmanager.entity.ProjectEntity;
import rw.venus.geosmartmanager.entity.UserEntity;
import rw.venus.geosmartmanager.exception.ApiException;
import rw.venus.geosmartmanager.repo.ClientRepository;
import rw.venus.geosmartmanager.repo.ProjectMemberRepository;
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
    private final ProjectMemberRepository projectMemberRepository;
    private final ProjectAccessService projectAccessService;
    private final AuditService auditService;

    public ProjectService(
            ProjectRepository projectRepository,
            ClientRepository clientRepository,
            ProjectMemberRepository projectMemberRepository,
            ProjectAccessService projectAccessService,
            AuditService auditService
    ) {
        this.projectRepository = projectRepository;
        this.clientRepository = clientRepository;
        this.projectMemberRepository = projectMemberRepository;
        this.projectAccessService = projectAccessService;
        this.auditService = auditService;
    }

    @Transactional(readOnly = true)
    public List<ProjectDtos.ProjectDto> list(UserEntity actor, UUID clientId) {
        List<ProjectEntity> projects = clientId == null
                ? listAll(actor)
                : listByClient(actor, clientId);
        return projects.stream().map(this::toDto).toList();
    }

    @Transactional(readOnly = true)
    public ProjectDtos.ProjectDto get(UserEntity actor, UUID id) {
        ProjectEntity project = projectRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Project not found"));

        projectAccessService.requireProjectRead(actor, project.getId());
        return toDto(project);
    }

    @Transactional
    public ProjectDtos.ProjectDto create(UserEntity actor, ProjectDtos.CreateProjectRequest req) {
        if (actor.getRole() == UserRole.CLIENT) {
            throw new ApiException(HttpStatus.FORBIDDEN, "FORBIDDEN", "Clients cannot create projects");
        }

        ClientEntity client = clientRepository.findById(req.clientId())
                .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "INVALID_CLIENT", "Client not found"));

        ProjectEntity project = new ProjectEntity();
        project.setClient(client);
        project.setName(req.name());
        project.setDescription(req.description());
        project.setType(req.type());
        project.setLocation(req.location());
        project.setScope(req.scope());
        project.setStartDate(req.startDate());
        project.setEndDate(req.endDate());
        ProjectEntity saved = projectRepository.save(project);

        ProjectMemberEntity membership = new ProjectMemberEntity();
        membership.setProject(saved);
        membership.setUser(actor);
        membership.setRole(ProjectMemberRole.PROJECT_ADMIN);
        projectMemberRepository.save(membership);

        auditService.log(actor, "PROJECT_CREATED", "Project", saved.getId());
        return toDto(saved);
    }

    @Transactional
    public ProjectDtos.ProjectDto update(UserEntity actor, UUID id, ProjectDtos.UpdateProjectRequest req) {
        ProjectEntity project = projectRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Project not found"));

        projectAccessService.requireProjectAdmin(actor, project.getId());

        project.setName(req.name());
        project.setDescription(req.description());
        project.setStatus(req.status());
        project.setType(req.type());
        project.setLocation(req.location());
        project.setScope(req.scope());
        project.setStartDate(req.startDate());
        project.setEndDate(req.endDate());
        project.setArchived(req.archived());
        ProjectEntity saved = projectRepository.save(project);
        auditService.log(actor, "PROJECT_UPDATED", "Project", saved.getId());
        return toDto(saved);
    }

    private List<ProjectEntity> listAll(UserEntity actor) {
        if (actor.getRole() == UserRole.ADMIN) {
            return projectRepository.findAllByOrderByCreatedAtDesc();
        }
        if (actor.getRole() == UserRole.CLIENT) {
            return projectRepository.findByClient_User_IdOrderByCreatedAtDesc(actor.getId());
        }
        return projectRepository.findAccessibleProjects(actor.getId());
    }

    private List<ProjectEntity> listByClient(UserEntity actor, UUID clientId) {
        if (actor.getRole() == UserRole.ADMIN) {
            return projectRepository.findByClientIdOrderByCreatedAtDesc(clientId);
        }
        if (actor.getRole() == UserRole.CLIENT) {
            return projectRepository.findByClient_User_IdOrderByCreatedAtDesc(actor.getId())
                    .stream()
                    .filter(p -> p.getClient().getId().equals(clientId))
                    .toList();
        }
        return projectRepository.findAccessibleProjectsByClient(actor.getId(), clientId);
    }

    private ProjectDtos.ProjectDto toDto(ProjectEntity p) {
        return new ProjectDtos.ProjectDto(
                p.getId(),
                p.getClient().getId(),
                p.getClient().getName(),
                p.getName(),
                p.getDescription(),
                p.getStatus(),
                p.getType(),
                p.getLocation(),
                p.getScope(),
                p.getStartDate(),
                p.getEndDate(),
                p.isArchived(),
                p.getCreatedAt()
        );
    }
}
