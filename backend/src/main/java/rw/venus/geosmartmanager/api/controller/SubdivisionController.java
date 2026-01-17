package rw.venus.geosmartmanager.api.controller;

import rw.venus.geosmartmanager.api.dto.SubdivisionDtos;
import rw.venus.geosmartmanager.service.CurrentUserService;
import rw.venus.geosmartmanager.service.SubdivisionService;
import jakarta.validation.Valid;
import java.nio.file.Path;
import java.util.List;
import java.util.UUID;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class SubdivisionController {
    private final SubdivisionService subdivisionService;
    private final CurrentUserService currentUserService;

    public SubdivisionController(SubdivisionService subdivisionService, CurrentUserService currentUserService) {
        this.subdivisionService = subdivisionService;
        this.currentUserService = currentUserService;
    }

    @PostMapping("/projects/{projectId}/subdivisions/run")
    public SubdivisionDtos.RunDto run(@PathVariable UUID projectId, @Valid @RequestBody SubdivisionDtos.RunRequest req) {
        return subdivisionService.run(currentUserService.requireCurrentUser(), projectId, req);
    }

    @GetMapping("/projects/{projectId}/subdivisions")
    public List<SubdivisionDtos.RunDto> list(@PathVariable UUID projectId) {
        return subdivisionService.list(projectId);
    }

    @GetMapping("/subdivisions/{runId}")
    public SubdivisionDtos.RunDetailDto get(@PathVariable UUID runId) {
        return subdivisionService.getDetail(runId);
    }

    @GetMapping("/subdivisions/{runId}/download")
    public ResponseEntity<Resource> download(@PathVariable UUID runId) {
        Path path = subdivisionService.getResultFile(runId);
        Resource resource = new FileSystemResource(path);
        String filename = "subdivision-" + runId + ".geojson";
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(MediaType.parseMediaType("application/geo+json"))
                .body(resource);
    }
}
