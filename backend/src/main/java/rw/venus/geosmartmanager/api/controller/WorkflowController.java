package rw.venus.geosmartmanager.api.controller;

import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import rw.venus.geosmartmanager.api.dto.WorkflowDtos;
import rw.venus.geosmartmanager.entity.WorkflowTaskEntity;
import rw.venus.geosmartmanager.service.WorkflowTaskService;

import java.util.List;

@RestController
@RequestMapping("/api")
public class WorkflowController {
    private final WorkflowTaskService workflowTaskService;

    public WorkflowController(WorkflowTaskService workflowTaskService) {
        this.workflowTaskService = workflowTaskService;
    }

    @PostMapping("/projects/{projectId}/tasks")
    @PreAuthorize("hasAnyRole('ADMIN','PROJECT_MANAGER','SURVEYOR','ENGINEER','CIVIL_ENGINEER')")
    public WorkflowDtos.WorkflowTaskResponse create(@PathVariable Long projectId, @Valid @RequestBody WorkflowDtos.WorkflowTaskRequest request) {
        WorkflowTaskEntity entity = workflowTaskService.create(projectId, request);
        return toResponse(entity);
    }

    @GetMapping("/projects/{projectId}/tasks")
    @PreAuthorize("hasAnyRole('ADMIN','PROJECT_MANAGER','SURVEYOR','ENGINEER','CIVIL_ENGINEER')")
    public List<WorkflowDtos.WorkflowTaskResponse> list(@PathVariable Long projectId) {
        return workflowTaskService.listByProject(projectId).stream().map(this::toResponse).toList();
    }

    @PatchMapping("/tasks/{taskId}/status")
    @PreAuthorize("hasAnyRole('ADMIN','PROJECT_MANAGER','SURVEYOR','ENGINEER','CIVIL_ENGINEER')")
    public WorkflowDtos.WorkflowTaskResponse updateStatus(@PathVariable Long taskId, @Valid @RequestBody WorkflowDtos.UpdateStatusRequest request) {
        return toResponse(workflowTaskService.updateStatus(taskId, request));
    }

    private WorkflowDtos.WorkflowTaskResponse toResponse(WorkflowTaskEntity entity) {
        return new WorkflowDtos.WorkflowTaskResponse(
                entity.getId(),
                entity.getProject().getId(),
                entity.getTitle(),
                entity.getDescription(),
                entity.getStatus(),
                entity.getAssigneeEmail(),
                entity.getDueDate()
        );
    }
}
