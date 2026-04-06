package rw.venus.geosmartmanager.api.controller;

import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import rw.venus.geosmartmanager.api.dto.ProjectRecordsDtos;
import rw.venus.geosmartmanager.entity.ProjectCommunicationEntity;
import rw.venus.geosmartmanager.service.ProjectCommunicationService;

import java.util.List;

@RestController
@RequestMapping("/api/projects/{projectId}/communications")
public class ProjectCommunicationController {
    private final ProjectCommunicationService projectCommunicationService;

    public ProjectCommunicationController(ProjectCommunicationService projectCommunicationService) {
        this.projectCommunicationService = projectCommunicationService;
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','PROJECT_MANAGER','SURVEYOR','ENGINEER','CIVIL_ENGINEER','CLIENT')")
    public List<ProjectRecordsDtos.ProjectCommunicationResponse> list(@PathVariable Long projectId) {
        return projectCommunicationService.list(projectId).stream().map(this::toResponse).toList();
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','PROJECT_MANAGER','SURVEYOR','ENGINEER','CIVIL_ENGINEER')")
    public ProjectRecordsDtos.ProjectCommunicationResponse create(@PathVariable Long projectId,
                                                                  @Valid @RequestBody ProjectRecordsDtos.ProjectCommunicationRequest request) {
        return toResponse(projectCommunicationService.create(projectId, request));
    }

    private ProjectRecordsDtos.ProjectCommunicationResponse toResponse(ProjectCommunicationEntity entity) {
        return new ProjectRecordsDtos.ProjectCommunicationResponse(
                entity.getId(),
                entity.getProject().getId(),
                entity.getChannel(),
                entity.getSubject(),
                entity.getContactPerson(),
                entity.getSummary(),
                entity.getOccurredAt(),
                entity.getCreatedAt()
        );
    }
}
