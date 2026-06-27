package rw.venus.geosmartmanager.service;

import org.springframework.stereotype.Service;
import rw.venus.geosmartmanager.api.dto.DatasetDtos;
import rw.venus.geosmartmanager.entity.DatasetEntity;
import rw.venus.geosmartmanager.entity.ProjectEntity;
import rw.venus.geosmartmanager.domain.DatasetSourceFormat;
import rw.venus.geosmartmanager.repo.DatasetRepository;

import java.time.Instant;
import java.util.List;

@Service
public class DatasetService {
    private final DatasetRepository datasetRepository;
    private final ProjectService projectService;
    private final AuditService auditService;
    private final CurrentUserService currentUserService;

    public DatasetService(DatasetRepository datasetRepository, ProjectService projectService, AuditService auditService, CurrentUserService currentUserService) {
        this.datasetRepository = datasetRepository;
        this.projectService = projectService;
        this.auditService = auditService;
        this.currentUserService = currentUserService;
    }

    public DatasetEntity create(Long projectId, DatasetDtos.DatasetRequest request) {
        ProjectEntity project = projectService.getActiveProject(projectId);
        DatasetEntity entity = DatasetEntity.builder()
                .project(project)
                .name(request.name())
                .type(request.type())
                .geoJson(request.geoJson())
                .sourceFormat(DatasetSourceFormat.GEOJSON) // default source format for manual GeoJSON input
                .sourceFileName(request.name().replaceAll("\\s+", "_") + ".geojson")
                .metadataJson("{}")
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();
        datasetRepository.save(entity);
        auditService.log(currentUserService.getCurrentUserEmail(), "CREATE", "Dataset", entity.getId(), "Dataset created");
        return entity;
    }

    public List<DatasetEntity> listByProject(Long projectId) {
        projectService.getProject(projectId);
        return datasetRepository.findByProjectId(projectId);
    }
}
