package rw.venus.geosmartmanager.api.controller;

import rw.venus.geosmartmanager.api.dto.WorkflowDtos;
import rw.venus.geosmartmanager.service.CurrentUserService;
import rw.venus.geosmartmanager.service.WorkflowTaskService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class WorkflowTaskController {
    private final WorkflowTaskService workflowTaskService;
    private final CurrentUserService currentUserService;

    public WorkflowTaskController(WorkflowTaskService workflowTaskService, CurrentUserService currentUserService) {
        this.workflowTaskService = workflowTaskService;
        this.currentUserService = currentUserService;
    }

    @GetMapping("/projects/{projectId}/tasks")
    public List<WorkflowDtos.TaskDto> list(@PathVariable UUID projectId) {
        return workflowTaskService.listByProject(projectId);
    }

    @PostMapping("/projects/{projectId}/tasks")
    public WorkflowDtos.TaskDto create(@PathVariable UUID projectId, @Valid @RequestBody WorkflowDtos.CreateTaskRequest req) {
        return workflowTaskService.create(currentUserService.requireCurrentUser(), projectId, req);
    }

    @PutMapping("/tasks/{taskId}")
    public WorkflowDtos.TaskDto update(@PathVariable UUID taskId, @Valid @RequestBody WorkflowDtos.UpdateTaskRequest req) {
        return workflowTaskService.update(currentUserService.requireCurrentUser(), taskId, req);
    }

    @DeleteMapping("/tasks/{taskId}")
    public void delete(@PathVariable UUID taskId) {
        workflowTaskService.delete(currentUserService.requireCurrentUser(), taskId);
    }
}

