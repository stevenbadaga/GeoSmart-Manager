package rw.venus.geosmartmanager.service;

import org.springframework.stereotype.Service;
import rw.venus.geosmartmanager.api.dto.WorkflowDtos;
import rw.venus.geosmartmanager.domain.WorkflowStatus;
import rw.venus.geosmartmanager.entity.ProjectEntity;
import rw.venus.geosmartmanager.entity.WorkflowTaskEntity;
import rw.venus.geosmartmanager.repo.ProjectRepository;
import rw.venus.geosmartmanager.repo.WorkflowTaskRepository;

import java.time.Instant;
import java.util.List;

@Service
public class WorkflowTaskService {
    private final WorkflowTaskRepository workflowTaskRepository;
    private final ProjectRepository projectRepository;
    private final AuditService auditService;
    private final CurrentUserService currentUserService;

    public WorkflowTaskService(WorkflowTaskRepository workflowTaskRepository, ProjectRepository projectRepository, AuditService auditService, CurrentUserService currentUserService) {
        this.workflowTaskRepository = workflowTaskRepository;
        this.projectRepository = projectRepository;
        this.auditService = auditService;
        this.currentUserService = currentUserService;
    }

    public WorkflowTaskEntity create(Long projectId, WorkflowDtos.WorkflowTaskRequest request) {
        ProjectEntity project = projectRepository.findById(projectId)
                .orElseThrow(() -> new IllegalArgumentException("Project not found"));
        WorkflowTaskEntity entity = WorkflowTaskEntity.builder()
                .project(project)
                .title(request.title())
                .description(request.description())
                .assigneeEmail(request.assigneeEmail())
                .dueDate(request.dueDate())
                .status(WorkflowStatus.TODO)
                .createdAt(Instant.now())
                .build();
        workflowTaskRepository.save(entity);
        auditService.log(currentUserService.getCurrentUserEmail(), "CREATE", "WorkflowTask", entity.getId(), "Task created");
        return entity;
    }

    public List<WorkflowTaskEntity> listByProject(Long projectId) {
        return workflowTaskRepository.findByProjectId(projectId);
    }

    public WorkflowTaskEntity updateStatus(Long taskId, WorkflowDtos.UpdateStatusRequest request) {
        WorkflowTaskEntity entity = workflowTaskRepository.findById(taskId)
                .orElseThrow(() -> new IllegalArgumentException("Task not found"));
        entity.setStatus(request.status());
        workflowTaskRepository.save(entity);
        auditService.log(currentUserService.getCurrentUserEmail(), "UPDATE", "WorkflowTask", entity.getId(), "Status updated");
        return entity;
    }
}
