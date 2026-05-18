package rw.venus.geosmartmanager.api.controller;

import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import rw.venus.geosmartmanager.api.dto.SubdivisionDtos;
import rw.venus.geosmartmanager.entity.SubdivisionRunEntity;
import rw.venus.geosmartmanager.service.SubdivisionModuleService;
import rw.venus.geosmartmanager.service.SubdivisionService;

import java.util.List;

@RestController
@RequestMapping("/api/projects/{projectId}/subdivisions")
public class SubdivisionController {
    private final SubdivisionService subdivisionService;
    private final SubdivisionModuleService subdivisionModuleService;

    public SubdivisionController(SubdivisionService subdivisionService,
                                 SubdivisionModuleService subdivisionModuleService) {
        this.subdivisionService = subdivisionService;
        this.subdivisionModuleService = subdivisionModuleService;
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

    @GetMapping("/demo-bundle")
    @PreAuthorize("hasAnyRole('ADMIN','PROJECT_MANAGER','SURVEYOR','ENGINEER','CIVIL_ENGINEER','CLIENT')")
    public SubdivisionDtos.DemoBundleResponse demoBundle(@PathVariable Long projectId) {
        return subdivisionModuleService.getDemoBundle(projectId);
    }

    @PostMapping("/validate")
    @PreAuthorize("hasAnyRole('ADMIN','PROJECT_MANAGER','SURVEYOR','ENGINEER','CIVIL_ENGINEER')")
    public SubdivisionDtos.SubdivisionRunResponse validate(@PathVariable Long projectId,
                                                           @Valid @RequestBody SubdivisionDtos.ValidateSubdivisionRequest request) {
        return toResponse(subdivisionModuleService.validateSubdivision(projectId, request));
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
                explanation,
                entity.getParentUpi(),
                entity.getProposedLandUse(),
                entity.getParentParcelGeoJson(),
                subdivisionModuleService.readValidationSummary(entity.getValidationSummaryJson()),
                entity.getCreatedAt()
        );
    }
}
