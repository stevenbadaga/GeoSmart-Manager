package rw.venus.geosmartmanager.api.controller;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import rw.venus.geosmartmanager.api.dto.AuditDtos;
import rw.venus.geosmartmanager.api.dto.AnalyticsDtos;
import rw.venus.geosmartmanager.service.AuditService;

import java.time.format.DateTimeFormatter;
import java.util.List;

@RestController
@RequestMapping("/api/audit")
public class AuditController {
    private final AuditService auditService;

    public AuditController(AuditService auditService) {
        this.auditService = auditService;
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','PROJECT_MANAGER','SURVEYOR','ENGINEER','CIVIL_ENGINEER')")
    public List<AuditDtos.AuditLogResponse> list() {
        DateTimeFormatter formatter = DateTimeFormatter.ISO_INSTANT;
        return auditService.list().stream()
                .map(log -> new AuditDtos.AuditLogResponse(
                        log.getId(),
                        log.getActorEmail(),
                        log.getAction(),
                        log.getEntityType(),
                        log.getEntityId(),
                        log.getDetails(),
                        formatter.format(log.getCreatedAt())
                ))
                .toList();
    }

    @GetMapping("/verify")
    @PreAuthorize("hasRole('ADMIN')")
    public AnalyticsDtos.AuditIntegrityResponse verify() {
        List<Long> broken = auditService.verifyChain();
        return new AnalyticsDtos.AuditIntegrityResponse(broken.isEmpty(), broken);
    }
}
