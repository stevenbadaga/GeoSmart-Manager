package rw.venus.geosmartmanager.service;

import rw.venus.geosmartmanager.api.dto.ComplianceConfigDtos;
import rw.venus.geosmartmanager.entity.ComplianceConfigEntity;
import rw.venus.geosmartmanager.entity.ProjectEntity;
import rw.venus.geosmartmanager.entity.UserEntity;
import rw.venus.geosmartmanager.exception.ApiException;
import rw.venus.geosmartmanager.repo.ComplianceConfigRepository;
import rw.venus.geosmartmanager.repo.ProjectRepository;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ComplianceConfigService {
    private final ComplianceConfigRepository configRepository;
    private final ProjectRepository projectRepository;
    private final ProjectAccessService projectAccessService;
    private final AuditService auditService;

    public ComplianceConfigService(
            ComplianceConfigRepository configRepository,
            ProjectRepository projectRepository,
            ProjectAccessService projectAccessService,
            AuditService auditService
    ) {
        this.configRepository = configRepository;
        this.projectRepository = projectRepository;
        this.projectAccessService = projectAccessService;
        this.auditService = auditService;
    }

    @Transactional
    public ComplianceConfigEntity getOrCreate(UUID projectId) {
        return configRepository.findByProjectId(projectId).orElseGet(() -> {
            ProjectEntity project = projectRepository.findById(projectId)
                    .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Project not found"));

            ComplianceConfigEntity cfg = new ComplianceConfigEntity();
            cfg.setProject(project);
            cfg.setMinParcelArea(200.0);
            return configRepository.save(cfg);
        });
    }

    @Transactional(readOnly = true)
    public ComplianceConfigDtos.ConfigDto getDto(UserEntity actor, UUID projectId) {
        projectAccessService.requireProjectRead(actor, projectId);
        ComplianceConfigEntity cfg = getOrCreate(projectId);
        return toDto(cfg);
    }

    @Transactional
    public ComplianceConfigDtos.ConfigDto update(UserEntity actor, UUID projectId, ComplianceConfigDtos.UpdateConfigRequest req) {
        projectAccessService.requireProjectWrite(actor, projectId);
        ComplianceConfigEntity cfg = getOrCreate(projectId);
        cfg.setMinParcelArea(req.minParcelArea());
        cfg.setMaxParcelArea(req.maxParcelArea());
        cfg.setExpectedParcelCount(req.expectedParcelCount());
        ComplianceConfigEntity saved = configRepository.save(cfg);

        auditService.log(actor, "COMPLIANCE_CONFIG_UPDATED", "ComplianceConfig", saved.getId(), Map.of(
                "projectId", projectId,
                "minParcelArea", saved.getMinParcelArea(),
                "maxParcelArea", saved.getMaxParcelArea(),
                "expectedParcelCount", saved.getExpectedParcelCount()
        ));

        return toDto(saved);
    }

    public ComplianceConfigDtos.ConfigDto toDto(ComplianceConfigEntity cfg) {
        return new ComplianceConfigDtos.ConfigDto(
                cfg.getId(),
                cfg.getProject().getId(),
                cfg.getMinParcelArea(),
                cfg.getMaxParcelArea(),
                cfg.getExpectedParcelCount(),
                cfg.getUpdatedAt()
        );
    }
}
