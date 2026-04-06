package rw.venus.geosmartmanager.api.controller;

import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import rw.venus.geosmartmanager.api.dto.ProjectDtos;
import rw.venus.geosmartmanager.entity.ProjectEntity;
import rw.venus.geosmartmanager.service.ProjectService;

import java.util.List;

@RestController
@RequestMapping("/api/projects")
public class ProjectController {
    private final ProjectService projectService;

    public ProjectController(ProjectService projectService) {
        this.projectService = projectService;
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','PROJECT_MANAGER')")
    public ProjectDtos.ProjectResponse create(@Valid @RequestBody ProjectDtos.ProjectRequest request) {
        return toResponse(projectService.create(request));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','PROJECT_MANAGER','SURVEYOR','ENGINEER','CIVIL_ENGINEER','CLIENT')")
    public List<ProjectDtos.ProjectResponse> list(@RequestParam(defaultValue = "false") boolean includeArchived) {
        return projectService.list(includeArchived).stream().map(this::toResponse).toList();
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','PROJECT_MANAGER')")
    public ProjectDtos.ProjectResponse update(@PathVariable Long id, @Valid @RequestBody ProjectDtos.ProjectRequest request) {
        return toResponse(projectService.update(id, request));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','PROJECT_MANAGER')")
    public void delete(@PathVariable Long id) {
        projectService.delete(id);
    }

    @PostMapping("/{id}/archive")
    @PreAuthorize("hasAnyRole('ADMIN','PROJECT_MANAGER')")
    public ProjectDtos.ProjectResponse archive(@PathVariable Long id) {
        return toResponse(projectService.archive(id));
    }

    @PostMapping("/{id}/restore")
    @PreAuthorize("hasAnyRole('ADMIN','PROJECT_MANAGER')")
    public ProjectDtos.ProjectResponse restore(@PathVariable Long id) {
        return toResponse(projectService.restore(id));
    }

    private ProjectDtos.ProjectResponse toResponse(ProjectEntity entity) {
        ProjectService.ProjectWorkflowSnapshot workflow = projectService.workflowSnapshot(entity.getId());
        return new ProjectDtos.ProjectResponse(
                entity.getId(),
                entity.getCode(),
                entity.getName(),
                entity.getProjectType(),
                entity.getLocationSummary(),
                entity.getScopeSummary(),
                entity.getDescription(),
                entity.getStatus(),
                entity.getStartDate(),
                entity.getEndDate(),
                entity.getClient().getId(),
                entity.getClient().getName(),
                entity.getArchivedAt() != null,
                entity.getArchivedAt(),
                projectService.documentCount(entity.getId()),
                projectService.communicationCount(entity.getId()),
                workflow.stage(),
                workflow.nextAction(),
                workflow.readinessPercent()
        );
    }
}
