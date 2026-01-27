package rw.venus.geosmartmanager.api.controller;

import rw.venus.geosmartmanager.api.dto.ProjectMessageDtos;
import rw.venus.geosmartmanager.service.CurrentUserService;
import rw.venus.geosmartmanager.service.ProjectMessageService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/projects/{projectId}/messages")
public class ProjectMessageController {
    private final ProjectMessageService projectMessageService;
    private final CurrentUserService currentUserService;

    public ProjectMessageController(ProjectMessageService projectMessageService, CurrentUserService currentUserService) {
        this.projectMessageService = projectMessageService;
        this.currentUserService = currentUserService;
    }

    @GetMapping
    public List<ProjectMessageDtos.MessageDto> list(@PathVariable UUID projectId) {
        return projectMessageService.list(currentUserService.requireCurrentUser(), projectId);
    }

    @PostMapping
    public ProjectMessageDtos.MessageDto create(@PathVariable UUID projectId, @Valid @RequestBody ProjectMessageDtos.CreateMessageRequest req) {
        return projectMessageService.create(currentUserService.requireCurrentUser(), projectId, req);
    }
}

