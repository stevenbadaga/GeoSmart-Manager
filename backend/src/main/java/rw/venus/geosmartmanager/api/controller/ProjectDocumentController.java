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
import rw.venus.geosmartmanager.entity.ProjectDocumentEntity;
import rw.venus.geosmartmanager.service.ProjectDocumentService;

import java.util.List;

@RestController
@RequestMapping("/api/projects/{projectId}/documents")
public class ProjectDocumentController {
    private final ProjectDocumentService projectDocumentService;

    public ProjectDocumentController(ProjectDocumentService projectDocumentService) {
        this.projectDocumentService = projectDocumentService;
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','PROJECT_MANAGER','SURVEYOR','ENGINEER','CIVIL_ENGINEER','CLIENT')")
    public List<ProjectRecordsDtos.ProjectDocumentResponse> list(@PathVariable Long projectId) {
        return projectDocumentService.list(projectId).stream().map(this::toResponse).toList();
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','PROJECT_MANAGER','ENGINEER','CIVIL_ENGINEER')")
    public ProjectRecordsDtos.ProjectDocumentResponse create(@PathVariable Long projectId,
                                                             @Valid @RequestBody ProjectRecordsDtos.ProjectDocumentRequest request) {
        return toResponse(projectDocumentService.create(projectId, request));
    }

    private ProjectRecordsDtos.ProjectDocumentResponse toResponse(ProjectDocumentEntity entity) {
        return new ProjectRecordsDtos.ProjectDocumentResponse(
                entity.getId(),
                entity.getProject().getId(),
                entity.getTitle(),
                entity.getCategory(),
                entity.getVersionLabel(),
                entity.getFileReference(),
                entity.getApprovalStatus(),
                entity.getNotes(),
                entity.getCreatedAt()
        );
    }
}
