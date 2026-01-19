package rw.venus.geosmartmanager.service;

import rw.venus.geosmartmanager.api.dto.WorkflowDtos;
import rw.venus.geosmartmanager.domain.TaskStatus;
import rw.venus.geosmartmanager.domain.UserRole;
import rw.venus.geosmartmanager.entity.ProjectEntity;
import rw.venus.geosmartmanager.entity.UserEntity;
import rw.venus.geosmartmanager.entity.WorkflowTaskEntity;
import rw.venus.geosmartmanager.exception.ApiException;
import rw.venus.geosmartmanager.repo.ProjectRepository;
import rw.venus.geosmartmanager.repo.ProjectMemberRepository;
import rw.venus.geosmartmanager.repo.UserRepository;
import rw.venus.geosmartmanager.repo.WorkflowTaskRepository;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class WorkflowTaskService {
    private final WorkflowTaskRepository taskRepository;
    private final ProjectRepository projectRepository;
    private final ProjectMemberRepository projectMemberRepository;
    private final UserRepository userRepository;
    private final ProjectAccessService projectAccessService;
    private final AuditService auditService;

    public WorkflowTaskService(
            WorkflowTaskRepository taskRepository,
            ProjectRepository projectRepository,
            ProjectMemberRepository projectMemberRepository,
            UserRepository userRepository,
            ProjectAccessService projectAccessService,
            AuditService auditService
    ) {
        this.taskRepository = taskRepository;
        this.projectRepository = projectRepository;
        this.projectMemberRepository = projectMemberRepository;
        this.userRepository = userRepository;
        this.projectAccessService = projectAccessService;
        this.auditService = auditService;
    }

    @Transactional(readOnly = true)
    public List<WorkflowDtos.TaskDto> listByProject(UserEntity actor, UUID projectId) {
        projectAccessService.requireProjectRead(actor, projectId);
        return taskRepository.findByProjectIdOrderByCreatedAtDesc(projectId).stream().map(this::toDto).toList();
    }

    @Transactional
    public WorkflowDtos.TaskDto create(UserEntity actor, UUID projectId, WorkflowDtos.CreateTaskRequest req) {
        projectAccessService.requireProjectWrite(actor, projectId);

        ProjectEntity project = projectRepository.findById(projectId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Project not found"));

        WorkflowTaskEntity task = new WorkflowTaskEntity();
        task.setProject(project);
        task.setCreatedBy(actor);
        task.setTitle(req.title());
        task.setDescription(req.description());
        task.setStatus(req.status() == null ? TaskStatus.TODO : req.status());
        task.setDueAt(req.dueAt());

        if (req.assignedToUserId() != null) {
            task.setAssignedTo(requireAssignableUser(projectId, req.assignedToUserId()));
        }

        WorkflowTaskEntity saved = taskRepository.save(task);
        auditService.log(actor, "TASK_CREATED", "WorkflowTask", saved.getId(), Map.of("projectId", projectId));
        return toDto(saved);
    }

    @Transactional
    public WorkflowDtos.TaskDto update(UserEntity actor, UUID taskId, WorkflowDtos.UpdateTaskRequest req) {
        WorkflowTaskEntity task = taskRepository.findById(taskId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Task not found"));

        projectAccessService.requireProjectWrite(actor, task.getProject().getId());

        task.setTitle(req.title());
        task.setDescription(req.description());
        task.setStatus(req.status());
        task.setDueAt(req.dueAt());

        if (req.assignedToUserId() == null) {
            task.setAssignedTo(null);
        } else {
            task.setAssignedTo(requireAssignableUser(task.getProject().getId(), req.assignedToUserId()));
        }

        WorkflowTaskEntity saved = taskRepository.save(task);
        auditService.log(actor, "TASK_UPDATED", "WorkflowTask", saved.getId());
        return toDto(saved);
    }

    @Transactional
    public void delete(UserEntity actor, UUID taskId) {
        WorkflowTaskEntity task = taskRepository.findById(taskId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Task not found"));
        projectAccessService.requireProjectWrite(actor, task.getProject().getId());
        taskRepository.delete(task);
        auditService.log(actor, "TASK_DELETED", "WorkflowTask", taskId);
    }

    @Transactional(readOnly = true)
    public List<WorkflowDtos.AssignableUserDto> listAssignableUsers(UserEntity actor, UUID projectId) {
        projectAccessService.requireProjectRead(actor, projectId);
        return projectMemberRepository.findByProjectIdOrderByAddedAtAsc(projectId).stream()
                .map(pm -> pm.getUser())
                .filter(UserEntity::isEnabled)
                .map(u -> new WorkflowDtos.AssignableUserDto(u.getId(), u.getUsername(), u.getRole().name()))
                .toList();
    }

    private UserEntity requireEnabledUser(UUID userId) {
        UserEntity user = userRepository.findById(userId)
                .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "INVALID_USER", "User not found"));
        if (!user.isEnabled()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "USER_DISABLED", "User is disabled");
        }
        return user;
    }

    private UserEntity requireAssignableUser(UUID projectId, UUID userId) {
        UserEntity user = requireEnabledUser(userId);
        if (user.getRole() == UserRole.ADMIN) {
            return user;
        }
        if (!projectMemberRepository.existsByProjectIdAndUserId(projectId, userId)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_ASSIGNEE", "User is not a member of this project");
        }
        return user;
    }

    private WorkflowDtos.TaskDto toDto(WorkflowTaskEntity t) {
        return new WorkflowDtos.TaskDto(
                t.getId(),
                t.getProject().getId(),
                t.getTitle(),
                t.getDescription(),
                t.getStatus(),
                t.getAssignedTo() == null ? null : t.getAssignedTo().getId(),
                t.getAssignedTo() == null ? null : t.getAssignedTo().getUsername(),
                t.getDueAt(),
                t.getCreatedAt(),
                t.getUpdatedAt()
        );
    }
}
