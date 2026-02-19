package rw.venus.geosmartmanager.service;

import org.springframework.stereotype.Service;
import rw.venus.geosmartmanager.api.dto.DatasetDtos;
import rw.venus.geosmartmanager.entity.DatasetEntity;
import rw.venus.geosmartmanager.entity.ProjectEntity;
import rw.venus.geosmartmanager.repo.DatasetRepository;
import rw.venus.geosmartmanager.repo.ProjectRepository;

import java.time.Instant;
import java.util.List;

@Service
public class DatasetService {
    private final DatasetRepository datasetRepository;
    private final ProjectRepository projectRepository;
    private final AuditService auditService;
    private final CurrentUserService currentUserService;

    public DatasetService(DatasetRepository datasetRepository, ProjectRepository projectRepository, AuditService auditService, CurrentUserService currentUserService) {
        this.datasetRepository = datasetRepository;
        this.projectRepository = projectRepository;
        this.auditService = auditService;
        this.currentUserService = currentUserService;
    }

    public DatasetEntity create(Long projectId, DatasetDtos.DatasetRequest request) {
        ProjectEntity project = projectRepository.findById(projectId)
                .orElseThrow(() -> new IllegalArgumentException("Project not found"));
        DatasetEntity entity = DatasetEntity.builder()
                .project(project)
                .name(request.name())
                .type(request.type())
                .geoJson(request.geoJson())
                .createdAt(Instant.now())
                .build();
        datasetRepository.save(entity);
        auditService.log(currentUserService.getCurrentUserEmail(), "CREATE", "Dataset", entity.getId(), "Dataset created");
        return entity;
    }

    public List<DatasetEntity> listByProject(Long projectId) {
        return datasetRepository.findByProjectId(projectId);
    }
}
