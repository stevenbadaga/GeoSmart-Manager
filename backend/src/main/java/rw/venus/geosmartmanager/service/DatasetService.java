package rw.venus.geosmartmanager.service;

import rw.venus.geosmartmanager.api.dto.DatasetDtos;
import rw.venus.geosmartmanager.entity.DatasetEntity;
import rw.venus.geosmartmanager.entity.ProjectEntity;
import rw.venus.geosmartmanager.entity.UserEntity;
import rw.venus.geosmartmanager.exception.ApiException;
import rw.venus.geosmartmanager.repo.DatasetRepository;
import rw.venus.geosmartmanager.repo.ProjectRepository;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
public class DatasetService {
    private final DatasetRepository datasetRepository;
    private final ProjectRepository projectRepository;
    private final StorageService storageService;
    private final ProjectAccessService projectAccessService;
    private final AuditService auditService;

    public DatasetService(
            DatasetRepository datasetRepository,
            ProjectRepository projectRepository,
            StorageService storageService,
            ProjectAccessService projectAccessService,
            AuditService auditService
    ) {
        this.datasetRepository = datasetRepository;
        this.projectRepository = projectRepository;
        this.storageService = storageService;
        this.projectAccessService = projectAccessService;
        this.auditService = auditService;
    }

    public List<DatasetDtos.DatasetDto> listByProject(UserEntity actor, UUID projectId) {
        projectAccessService.requireProjectRead(actor, projectId);
        return datasetRepository.findByProjectIdOrderByUploadedAtDesc(projectId).stream().map(this::toDto).toList();
    }

    public DatasetDtos.DatasetDto upload(UserEntity actor, UUID projectId, DatasetDtos.CreateDatasetMetadata meta, MultipartFile file) {
        projectAccessService.requireProjectWrite(actor, projectId);

        ProjectEntity project = projectRepository.findById(projectId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Project not found"));

        if (file == null || file.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_FILE", "File is required");
        }

        DatasetEntity dataset = new DatasetEntity();
        dataset.setProject(project);
        dataset.setName(meta.name());
        dataset.setType(meta.type());
        dataset.setOriginalFilename(file.getOriginalFilename() == null ? "upload.geojson" : file.getOriginalFilename());
        dataset.setContentType(file.getContentType());
        dataset.setSizeBytes(file.getSize());
        dataset.setStoredPath("PENDING");
        DatasetEntity saved = datasetRepository.save(dataset);

        String ext = guessExtension(saved.getOriginalFilename());
        Path abs = storageService.resolve("projects", projectId.toString(), "datasets", saved.getId() + ext);
        storageService.ensureParentDir(abs);
        try {
            Files.write(abs, file.getBytes());
        } catch (IOException ex) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "STORAGE_ERROR", "Failed to store file");
        }

        saved.setStoredPath(storageService.getRoot().relativize(abs).toString());
        saved = datasetRepository.save(saved);

        auditService.log(actor, "DATASET_UPLOADED", "Dataset", saved.getId());
        return toDto(saved);
    }

    public DatasetEntity require(UUID datasetId) {
        return datasetRepository.findById(datasetId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Dataset not found"));
    }

    public DatasetEntity requireAccessible(UserEntity actor, UUID datasetId) {
        DatasetEntity dataset = require(datasetId);
        projectAccessService.requireProjectRead(actor, dataset.getProject().getId());
        return dataset;
    }

    public Path resolvePath(DatasetEntity dataset) {
        return storageService.getRoot().resolve(dataset.getStoredPath()).normalize();
    }

    public Path resolveExistingPath(DatasetEntity dataset) {
        Path path = resolvePath(dataset);
        if (!Files.exists(path)) {
            throw new ApiException(HttpStatus.NOT_FOUND, "FILE_NOT_FOUND", "Dataset file not found");
        }
        return path;
    }

    @Transactional
    public void delete(UserEntity actor, UUID datasetId) {
        DatasetEntity dataset = requireAccessible(actor, datasetId);
        projectAccessService.requireProjectWrite(actor, dataset.getProject().getId());
        Path path = resolvePath(dataset);
        datasetRepository.delete(dataset);

        try {
            Files.deleteIfExists(path);
        } catch (IOException ignored) {
            // Best effort. The DB record is the source of truth; a leftover file is non-critical for the prototype.
        }

        auditService.log(actor, "DATASET_DELETED", "Dataset", datasetId);
    }

    private DatasetDtos.DatasetDto toDto(DatasetEntity d) {
        return new DatasetDtos.DatasetDto(
                d.getId(),
                d.getProject().getId(),
                d.getName(),
                d.getType(),
                d.getOriginalFilename(),
                d.getContentType(),
                d.getSizeBytes(),
                d.getUploadedAt()
        );
    }

    private String guessExtension(String filename) {
        if (filename == null) {
            return ".geojson";
        }
        String lower = filename.toLowerCase();
        if (lower.endsWith(".json")) {
            return ".json";
        }
        if (lower.endsWith(".geojson")) {
            return ".geojson";
        }
        return ".geojson";
    }
}
