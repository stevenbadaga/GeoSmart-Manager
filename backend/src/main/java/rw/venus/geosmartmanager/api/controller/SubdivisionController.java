package rw.venus.geosmartmanager.api.controller;

import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import rw.venus.geosmartmanager.api.dto.SubdivisionDtos;
import rw.venus.geosmartmanager.entity.SubdivisionRunEntity;
import rw.venus.geosmartmanager.service.SubdivisionService;

import java.util.List;

@RestController
@RequestMapping("/api/projects/{projectId}/subdivisions")
public class SubdivisionController {
    private final SubdivisionService subdivisionService;

    public SubdivisionController(SubdivisionService subdivisionService) {
        this.subdivisionService = subdivisionService;
    }

    @PostMapping("/run")
    @PreAuthorize("hasAnyRole('ADMIN','PROJECT_MANAGER','ENGINEER','CIVIL_ENGINEER')")
    public SubdivisionDtos.SubdivisionRunResponse run(@PathVariable Long projectId, @Valid @RequestBody SubdivisionDtos.RunSubdivisionRequest request) {
        SubdivisionRunEntity entity = subdivisionService.runSubdivision(projectId, request);
        return toResponse(entity);
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','PROJECT_MANAGER','SURVEYOR','ENGINEER','CIVIL_ENGINEER','CLIENT')")
    public List<SubdivisionDtos.SubdivisionRunResponse> list(@PathVariable Long projectId) {
        return subdivisionService.listRuns(projectId).stream().map(this::toResponse).toList();
    }

    private SubdivisionDtos.SubdivisionRunResponse toResponse(SubdivisionRunEntity entity) {
        SubdivisionDtos.AiExplanation explanation = subdivisionService.buildAiExplanation(entity);
        return new SubdivisionDtos.SubdivisionRunResponse(
                entity.getId(),
                entity.getProject().getId(),
                entity.getDataset().getId(),
                entity.getStatus(),
                entity.getOptimizationMode(),
                entity.getParcelCount(),
                entity.getAvgParcelAreaSqm(),
                entity.getQualityScore(),
                entity.getResultGeoJson(),
                explanation
        );
    }
}
