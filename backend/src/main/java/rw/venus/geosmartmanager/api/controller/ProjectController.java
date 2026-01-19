package rw.venus.geosmartmanager.api.controller;

import rw.venus.geosmartmanager.api.dto.ProjectDtos;
import rw.venus.geosmartmanager.service.CurrentUserService;
import rw.venus.geosmartmanager.service.ProjectService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/projects")
public class ProjectController {
    private final ProjectService projectService;
    private final CurrentUserService currentUserService;

    public ProjectController(ProjectService projectService, CurrentUserService currentUserService) {
        this.projectService = projectService;
        this.currentUserService = currentUserService;
    }

    @GetMapping
    public List<ProjectDtos.ProjectDto> list(@RequestParam(required = false) UUID clientId) {
        return projectService.list(currentUserService.requireCurrentUser(), clientId);
    }

    @GetMapping("/{id}")
    public ProjectDtos.ProjectDto get(@PathVariable UUID id) {
        return projectService.get(currentUserService.requireCurrentUser(), id);
    }

    @PostMapping
    public ProjectDtos.ProjectDto create(@Valid @RequestBody ProjectDtos.CreateProjectRequest req) {
        return projectService.create(currentUserService.requireCurrentUser(), req);
    }

    @PutMapping("/{id}")
    public ProjectDtos.ProjectDto update(@PathVariable UUID id, @Valid @RequestBody ProjectDtos.UpdateProjectRequest req) {
        return projectService.update(currentUserService.requireCurrentUser(), id, req);
    }
}
