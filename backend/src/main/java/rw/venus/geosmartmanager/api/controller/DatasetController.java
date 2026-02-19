package rw.venus.geosmartmanager.api.controller;

import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import rw.venus.geosmartmanager.api.dto.AnalyticsDtos;
import rw.venus.geosmartmanager.api.dto.DatasetDtos;
import rw.venus.geosmartmanager.entity.DatasetEntity;
import rw.venus.geosmartmanager.service.DatasetAnalysisService;
import rw.venus.geosmartmanager.service.DatasetService;

import java.util.List;

@RestController
@RequestMapping("/api/projects/{projectId}/datasets")
public class DatasetController {
    private final DatasetService datasetService;
    private final DatasetAnalysisService datasetAnalysisService;

    public DatasetController(DatasetService datasetService, DatasetAnalysisService datasetAnalysisService) {
        this.datasetService = datasetService;
        this.datasetAnalysisService = datasetAnalysisService;
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','PROJECT_MANAGER','SURVEYOR','ENGINEER','CIVIL_ENGINEER')")
    public DatasetDtos.DatasetResponse create(@PathVariable Long projectId, @Valid @RequestBody DatasetDtos.DatasetRequest request) {
        DatasetEntity entity = datasetService.create(projectId, request);
        return toResponse(entity);
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','PROJECT_MANAGER','SURVEYOR','ENGINEER','CIVIL_ENGINEER')")
    public List<DatasetDtos.DatasetResponse> list(@PathVariable Long projectId) {
        return datasetService.listByProject(projectId).stream().map(this::toResponse).toList();
    }

    @GetMapping("/{datasetId}/analysis")
    @PreAuthorize("hasAnyRole('ADMIN','PROJECT_MANAGER','SURVEYOR','ENGINEER','CIVIL_ENGINEER')")
    public AnalyticsDtos.DatasetAnalysisResponse analyze(@PathVariable Long projectId, @PathVariable Long datasetId) {
        return datasetAnalysisService.analyze(projectId, datasetId);
    }

    private DatasetDtos.DatasetResponse toResponse(DatasetEntity entity) {
        return new DatasetDtos.DatasetResponse(entity.getId(), entity.getName(), entity.getType(), entity.getGeoJson(), entity.getProject().getId());
    }
}
