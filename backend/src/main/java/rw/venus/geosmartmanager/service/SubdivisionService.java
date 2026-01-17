package rw.venus.geosmartmanager.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import rw.venus.geosmartmanager.api.dto.SubdivisionDtos;
import rw.venus.geosmartmanager.domain.RunStatus;
import rw.venus.geosmartmanager.entity.DatasetEntity;
import rw.venus.geosmartmanager.entity.ProjectEntity;
import rw.venus.geosmartmanager.entity.SubdivisionRunEntity;
import rw.venus.geosmartmanager.entity.UserEntity;
import rw.venus.geosmartmanager.exception.ApiException;
import rw.venus.geosmartmanager.repo.DatasetRepository;
import rw.venus.geosmartmanager.repo.ProjectRepository;
import rw.venus.geosmartmanager.repo.SubdivisionRunRepository;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.util.Comparator;
import java.util.Optional;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

@Service
public class SubdivisionService {
    private final ProjectRepository projectRepository;
    private final DatasetRepository datasetRepository;
    private final SubdivisionRunRepository subdivisionRunRepository;
    private final StorageService storageService;
    private final GeoJsonService geoJsonService;
    private final ObjectMapper objectMapper;
    private final AuditService auditService;

    public SubdivisionService(
            ProjectRepository projectRepository,
            DatasetRepository datasetRepository,
            SubdivisionRunRepository subdivisionRunRepository,
            StorageService storageService,
            GeoJsonService geoJsonService,
            ObjectMapper objectMapper,
            AuditService auditService
    ) {
        this.projectRepository = projectRepository;
        this.datasetRepository = datasetRepository;
        this.subdivisionRunRepository = subdivisionRunRepository;
        this.storageService = storageService;
        this.geoJsonService = geoJsonService;
        this.objectMapper = objectMapper;
        this.auditService = auditService;
    }

    public SubdivisionDtos.RunDto run(UserEntity actor, UUID projectId, SubdivisionDtos.RunRequest req) {
        ProjectEntity project = projectRepository.findById(projectId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Project not found"));

        DatasetEntity dataset = pickDataset(projectId).orElseThrow(() ->
                new ApiException(HttpStatus.BAD_REQUEST, "NO_DATASET", "Upload a cadastral GeoJSON dataset first"));

        SubdivisionRunEntity run = new SubdivisionRunEntity();
        run.setProject(project);
        run.setCreatedBy(actor);
        run.setStatus(RunStatus.RUNNING);
        run.setTargetParcels(req.targetParcels());
        run.setMinParcelArea(req.minParcelArea());
        run.setStartedAt(Instant.now());
        run = subdivisionRunRepository.save(run);

        try {
            Path datasetPath = storageService.getRoot().resolve(dataset.getStoredPath()).normalize();
            GeoJsonService.BoundingBox bbox = geoJsonService.findFirstPolygonBBox(datasetPath);
            ObjectNode result = geoJsonService.buildRectSubdivision(bbox, run.getTargetParcels());

            Path out = storageService.resolve("projects", projectId.toString(), "subdivisions", run.getId() + ".geojson");
            storageService.ensureParentDir(out);
            Files.writeString(out, objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(result));

            run.setResultPath(storageService.getRoot().relativize(out).toString());
            run.setStatus(RunStatus.COMPLETED);
            run.setFinishedAt(Instant.now());
            run = subdivisionRunRepository.save(run);

            auditService.log(actor, "SUBDIVISION_RUN_COMPLETED", "SubdivisionRun", run.getId());
            return toDto(run);
        } catch (ApiException ex) {
            fail(run, ex.getMessage());
            throw ex;
        } catch (IOException ex) {
            fail(run, "Failed to generate subdivision output");
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "SUBDIVISION_ERROR", "Failed to generate subdivision output");
        }
    }

    public java.util.List<SubdivisionDtos.RunDto> list(UUID projectId) {
        return subdivisionRunRepository.findByProjectIdOrderByStartedAtDesc(projectId).stream().map(this::toDto).toList();
    }

    public SubdivisionDtos.RunDetailDto getDetail(UUID runId) {
        SubdivisionRunEntity run = subdivisionRunRepository.findById(runId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Subdivision run not found"));
        String geojson = null;
        if (run.getResultPath() != null) {
            try {
                geojson = Files.readString(storageService.getRoot().resolve(run.getResultPath()).normalize());
            } catch (IOException ignored) {
                geojson = null;
            }
        }
        return new SubdivisionDtos.RunDetailDto(toDto(run), geojson);
    }

    public Path getResultFile(UUID runId) {
        SubdivisionRunEntity run = subdivisionRunRepository.findById(runId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Subdivision run not found"));
        if (run.getResultPath() == null || run.getResultPath().isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "RUN_NOT_READY", "Subdivision run has no result yet");
        }

        Path path = storageService.getRoot().resolve(run.getResultPath()).normalize();
        if (!Files.exists(path)) {
            throw new ApiException(HttpStatus.NOT_FOUND, "RESULT_NOT_FOUND", "Subdivision result file not found");
        }
        return path;
    }

    private Optional<DatasetEntity> pickDataset(UUID projectId) {
        return datasetRepository.findByProjectId(projectId).stream()
                .sorted(Comparator.comparing(DatasetEntity::getUploadedAt).reversed())
                .findFirst();
    }

    private void fail(SubdivisionRunEntity run, String errorMessage) {
        run.setStatus(RunStatus.FAILED);
        run.setErrorMessage(errorMessage);
        run.setFinishedAt(Instant.now());
        subdivisionRunRepository.save(run);
    }

    private SubdivisionDtos.RunDto toDto(SubdivisionRunEntity run) {
        return new SubdivisionDtos.RunDto(
                run.getId(),
                run.getProject().getId(),
                run.getStatus(),
                run.getTargetParcels(),
                run.getMinParcelArea(),
                run.getStartedAt(),
                run.getFinishedAt()
        );
    }
}
