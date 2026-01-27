package rw.venus.geosmartmanager.service;

import rw.venus.geosmartmanager.api.dto.FieldDtos;
import rw.venus.geosmartmanager.entity.EquipmentLogEntity;
import rw.venus.geosmartmanager.entity.ProjectEntity;
import rw.venus.geosmartmanager.entity.UserEntity;
import rw.venus.geosmartmanager.exception.ApiException;
import rw.venus.geosmartmanager.repo.EquipmentLogRepository;
import rw.venus.geosmartmanager.repo.ProjectRepository;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class EquipmentLogService {
    private final ProjectRepository projectRepository;
    private final EquipmentLogRepository equipmentLogRepository;
    private final ProjectAccessService projectAccessService;
    private final AuditService auditService;

    public EquipmentLogService(
            ProjectRepository projectRepository,
            EquipmentLogRepository equipmentLogRepository,
            ProjectAccessService projectAccessService,
            AuditService auditService
    ) {
        this.projectRepository = projectRepository;
        this.equipmentLogRepository = equipmentLogRepository;
        this.projectAccessService = projectAccessService;
        this.auditService = auditService;
    }

    @Transactional(readOnly = true)
    public List<FieldDtos.EquipmentLogDto> list(UserEntity actor, UUID projectId) {
        projectAccessService.requireProjectRead(actor, projectId);
        return equipmentLogRepository.findByProjectIdOrderByCreatedAtDesc(projectId)
                .stream()
                .map(this::toDto)
                .toList();
    }

    @Transactional
    public FieldDtos.EquipmentLogDto create(UserEntity actor, UUID projectId, FieldDtos.CreateEquipmentLogRequest req) {
        projectAccessService.requireProjectWrite(actor, projectId);

        ProjectEntity project = projectRepository.findById(projectId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Project not found"));

        EquipmentLogEntity log = new EquipmentLogEntity();
        log.setProject(project);
        log.setCreatedBy(actor);
        log.setEquipmentName(req.equipmentName());
        log.setSerialNumber(req.serialNumber());
        log.setCalibrationDate(req.calibrationDate());
        log.setStatus(req.status());
        log.setNotes(req.notes());

        EquipmentLogEntity saved = equipmentLogRepository.save(log);
        auditService.log(actor, "EQUIPMENT_LOG_CREATED", "EquipmentLog", saved.getId());
        return toDto(saved);
    }

    private FieldDtos.EquipmentLogDto toDto(EquipmentLogEntity e) {
        return new FieldDtos.EquipmentLogDto(
                e.getId(),
                e.getProject().getId(),
                e.getEquipmentName(),
                e.getSerialNumber(),
                e.getCalibrationDate(),
                e.getStatus(),
                e.getNotes(),
                e.getCreatedBy() == null ? null : e.getCreatedBy().getUsername(),
                e.getCreatedAt()
        );
    }
}

