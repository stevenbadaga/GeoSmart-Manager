package rw.venus.geosmartmanager.api.controller;

import rw.venus.geosmartmanager.api.dto.DatasetDtos;
import rw.venus.geosmartmanager.domain.DatasetType;
import rw.venus.geosmartmanager.entity.DatasetEntity;
import rw.venus.geosmartmanager.service.CurrentUserService;
import rw.venus.geosmartmanager.service.DatasetService;
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
@RequestMapping("/api")
public class DatasetController {
    private final DatasetService datasetService;
    private final CurrentUserService currentUserService;

    public DatasetController(DatasetService datasetService, CurrentUserService currentUserService) {
        this.datasetService = datasetService;
        this.currentUserService = currentUserService;
    }

    @GetMapping("/projects/{projectId}/datasets")
    public List<DatasetDtos.DatasetDto> list(@PathVariable UUID projectId) {
        return datasetService.listByProject(currentUserService.requireCurrentUser(), projectId);
    }

    @PostMapping(value = "/projects/{projectId}/datasets/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public DatasetDtos.DatasetDto upload(
            @PathVariable UUID projectId,
            @RequestParam @NotBlank String name,
            @RequestParam DatasetType type,
            @RequestParam MultipartFile file
    ) {
        DatasetDtos.CreateDatasetMetadata meta = new DatasetDtos.CreateDatasetMetadata(name, type);
        return datasetService.upload(currentUserService.requireCurrentUser(), projectId, meta, file);
    }

    @GetMapping("/datasets/{datasetId}/download")
    public ResponseEntity<Resource> download(@PathVariable UUID datasetId) {
        DatasetEntity dataset = datasetService.requireAccessible(currentUserService.requireCurrentUser(), datasetId);
        Path path = datasetService.resolveExistingPath(dataset);
        Resource resource = new FileSystemResource(path);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + dataset.getOriginalFilename() + "\"")
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .body(resource);
    }

    @DeleteMapping("/datasets/{datasetId}")
    public void delete(@PathVariable UUID datasetId) {
        datasetService.delete(currentUserService.requireCurrentUser(), datasetId);
    }
}
