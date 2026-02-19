package rw.venus.geosmartmanager.api.controller;

import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import rw.venus.geosmartmanager.api.dto.ComplianceDtos;
import rw.venus.geosmartmanager.entity.ComplianceCheckEntity;
import rw.venus.geosmartmanager.service.ComplianceService;

import java.util.List;

@RestController
@RequestMapping("/api/projects/{projectId}/compliance")
public class ComplianceController {
    private final ComplianceService complianceService;

    public ComplianceController(ComplianceService complianceService) {
        this.complianceService = complianceService;
    }

    @PostMapping("/check")
    @PreAuthorize("hasAnyRole('ADMIN','PROJECT_MANAGER','ENGINEER','CIVIL_ENGINEER')")
    public ComplianceDtos.ComplianceResponse check(@PathVariable Long projectId, @Valid @RequestBody ComplianceDtos.RunComplianceRequest request) {
        ComplianceCheckEntity entity = complianceService.runCompliance(projectId, request);
        return toResponse(entity);
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','PROJECT_MANAGER','SURVEYOR','ENGINEER','CIVIL_ENGINEER','CLIENT')")
    public List<ComplianceDtos.ComplianceResponse> list(@PathVariable Long projectId) {
        return complianceService.listChecks(projectId).stream().map(this::toResponse).toList();
    }

    private ComplianceDtos.ComplianceResponse toResponse(ComplianceCheckEntity entity) {
        return new ComplianceDtos.ComplianceResponse(
                entity.getId(),
                entity.getProject().getId(),
                entity.getSubdivisionRun().getId(),
                entity.getStatus(),
                entity.getFindings()
        );
    }
}
