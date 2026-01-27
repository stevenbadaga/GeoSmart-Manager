package rw.venus.geosmartmanager.api.controller;

import rw.venus.geosmartmanager.api.dto.ProjectDocumentDtos;
import rw.venus.geosmartmanager.domain.ProjectDocumentType;
import rw.venus.geosmartmanager.entity.ProjectDocumentEntity;
import rw.venus.geosmartmanager.service.CurrentUserService;
import rw.venus.geosmartmanager.service.ProjectDocumentService;
import jakarta.validation.constraints.NotBlank;
import java.nio.file.Path;
import java.util.List;
import java.util.UUID;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/projects/{projectId}/documents")
public class ProjectDocumentController {
    private final ProjectDocumentService projectDocumentService;
    private final CurrentUserService currentUserService;

    public ProjectDocumentController(ProjectDocumentService projectDocumentService, CurrentUserService currentUserService) {
        this.projectDocumentService = projectDocumentService;
        this.currentUserService = currentUserService;
    }

    @GetMapping
    public List<ProjectDocumentDtos.DocumentDto> list(@PathVariable UUID projectId) {
        return projectDocumentService.list(currentUserService.requireCurrentUser(), projectId);
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ProjectDocumentDtos.DocumentDto upload(
            @PathVariable UUID projectId,
            @RequestParam @NotBlank String name,
            @RequestParam ProjectDocumentType docType,
            @RequestParam MultipartFile file
    ) {
        ProjectDocumentDtos.UploadDocumentMetadata meta = new ProjectDocumentDtos.UploadDocumentMetadata(name, docType);
        return projectDocumentService.upload(currentUserService.requireCurrentUser(), projectId, meta, file);
    }

    @GetMapping("/{docId}/download")
    public ResponseEntity<Resource> download(@PathVariable UUID projectId, @PathVariable UUID docId) {
        ProjectDocumentEntity doc = projectDocumentService.requireAccessible(currentUserService.requireCurrentUser(), projectId, docId);
        Path p = projectDocumentService.resolveExistingPath(doc);
        Resource resource = new FileSystemResource(p);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + doc.getOriginalFilename() + "\"")
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .body(resource);
    }

    @DeleteMapping("/{docId}")
    public void delete(@PathVariable UUID projectId, @PathVariable UUID docId) {
        projectDocumentService.delete(currentUserService.requireCurrentUser(), projectId, docId);
    }
}

