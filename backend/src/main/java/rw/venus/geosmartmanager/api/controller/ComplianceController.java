package rw.venus.geosmartmanager.api.controller;

import rw.venus.geosmartmanager.api.dto.ComplianceConfigDtos;
import rw.venus.geosmartmanager.api.dto.ComplianceDtos;
import rw.venus.geosmartmanager.service.ComplianceConfigService;
import rw.venus.geosmartmanager.service.ComplianceService;
import rw.venus.geosmartmanager.service.CurrentUserService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/projects/{projectId}/compliance")
public class ComplianceController {
    private final ComplianceService complianceService;
    private final ComplianceConfigService complianceConfigService;
    private final CurrentUserService currentUserService;

    public ComplianceController(
            ComplianceService complianceService,
            ComplianceConfigService complianceConfigService,
            CurrentUserService currentUserService
    ) {
        this.complianceService = complianceService;
        this.complianceConfigService = complianceConfigService;
        this.currentUserService = currentUserService;
    }

    @GetMapping("/config")
    public ComplianceConfigDtos.ConfigDto getConfig(@PathVariable UUID projectId) {
        return complianceConfigService.getDto(currentUserService.requireCurrentUser(), projectId);
    }

    @PutMapping("/config")
    public ComplianceConfigDtos.ConfigDto updateConfig(@PathVariable UUID projectId,
                                                      @Valid @RequestBody ComplianceConfigDtos.UpdateConfigRequest req) {
        return complianceConfigService.update(currentUserService.requireCurrentUser(), projectId, req);
    }

    @PostMapping("/check")
    public ComplianceDtos.ComplianceDto check(@PathVariable UUID projectId, @Valid @RequestBody ComplianceDtos.CheckRequest req) {
        return complianceService.check(currentUserService.requireCurrentUser(), projectId, req);
    }

    @GetMapping
    public List<ComplianceDtos.ComplianceDto> list(@PathVariable UUID projectId) {
        return complianceService.list(currentUserService.requireCurrentUser(), projectId);
    }
}
