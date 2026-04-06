package rw.venus.geosmartmanager.api.controller;

import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import rw.venus.geosmartmanager.api.dto.ComplianceDtos;
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
        return complianceService.toResponse(complianceService.runCompliance(projectId, request));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','PROJECT_MANAGER','SURVEYOR','ENGINEER','CIVIL_ENGINEER','CLIENT')")
    public List<ComplianceDtos.ComplianceResponse> list(@PathVariable Long projectId) {
        return complianceService.listChecks(projectId).stream().map(complianceService::toResponse).toList();
    }

    @GetMapping("/live/{subdivisionRunId}")
    @PreAuthorize("hasAnyRole('ADMIN','PROJECT_MANAGER','SURVEYOR','ENGINEER','CIVIL_ENGINEER')")
    public ComplianceDtos.ComplianceResponse live(@PathVariable Long projectId,
                                                  @PathVariable Long subdivisionRunId,
                                                  @RequestParam(required = false) Long maxAgeSeconds) {
        return complianceService.liveCheck(projectId, subdivisionRunId, maxAgeSeconds);
    }

    @GetMapping("/updates")
    @PreAuthorize("hasAnyRole('ADMIN','PROJECT_MANAGER','SURVEYOR','ENGINEER','CIVIL_ENGINEER','CLIENT')")
    public List<ComplianceDtos.RegulatoryUpdateResponse> updates(@PathVariable Long projectId) {
        return complianceService.listRegulatoryUpdates();
    }

    @GetMapping("/{checkId}/submission-package")
    @PreAuthorize("hasAnyRole('ADMIN','PROJECT_MANAGER','SURVEYOR','ENGINEER','CIVIL_ENGINEER')")
    public ComplianceDtos.SubmissionPackageResponse submissionPackage(@PathVariable Long projectId, @PathVariable Long checkId) {
        return complianceService.buildSubmissionPackage(projectId, checkId);
    }

    @GetMapping("/{checkId}/certificate-template")
    @PreAuthorize("hasAnyRole('ADMIN','PROJECT_MANAGER','SURVEYOR','ENGINEER','CIVIL_ENGINEER')")
    public ComplianceDtos.CertificateTemplateResponse certificateTemplate(@PathVariable Long projectId, @PathVariable Long checkId) {
        return complianceService.buildCertificateTemplate(projectId, checkId);
    }
}
