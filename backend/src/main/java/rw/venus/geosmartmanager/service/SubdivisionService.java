package rw.venus.geosmartmanager.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import rw.venus.geosmartmanager.api.dto.SubdivisionDtos;
import rw.venus.geosmartmanager.domain.DatasetType;
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
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.locationtech.jts.geom.Geometry;
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
    private final ProjectAccessService projectAccessService;
    private final AuditService auditService;

    public SubdivisionService(
            ProjectRepository projectRepository,
            DatasetRepository datasetRepository,
            SubdivisionRunRepository subdivisionRunRepository,
            StorageService storageService,
            GeoJsonService geoJsonService,
            ObjectMapper objectMapper,
            ProjectAccessService projectAccessService,
            AuditService auditService
    ) {
        this.projectRepository = projectRepository;
        this.datasetRepository = datasetRepository;
        this.subdivisionRunRepository = subdivisionRunRepository;
        this.storageService = storageService;
        this.geoJsonService = geoJsonService;
        this.objectMapper = objectMapper;
        this.projectAccessService = projectAccessService;
        this.auditService = auditService;
    }

    public SubdivisionDtos.RunDto run(UserEntity actor, UUID projectId, SubdivisionDtos.RunRequest req) {
        projectAccessService.requireProjectWrite(actor, projectId);

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
            String geoPath = dataset.getPreviewGeojsonPath() != null && !dataset.getPreviewGeojsonPath().isBlank()
                    ? dataset.getPreviewGeojsonPath()
                    : dataset.getStoredPath();
            Path datasetPath = storageService.getRoot().resolve(geoPath).normalize();

            Geometry boundary = geoJsonService.readFirstPolygonalGeometry(datasetPath);
            double boundaryAreaSqm = geoJsonService.areaSqm(boundary);
            if (!Double.isFinite(boundaryAreaSqm) || boundaryAreaSqm <= 0) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_GEOJSON", "Unable to compute boundary area");
            }

            int maxParcels = Math.max(1, (int) Math.floor(boundaryAreaSqm / run.getMinParcelArea()));
            if (run.getTargetParcels() > maxParcels) {
                throw new ApiException(
                        HttpStatus.BAD_REQUEST,
                        "MIN_AREA_CONSTRAINT",
                        "Target parcels too high for minimum parcel area. Max parcels: " + maxParcels
                );
            }

            ObjectNode result = geoJsonService.buildStripSubdivision(boundary, run.getTargetParcels());

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

    public java.util.List<SubdivisionDtos.RunDto> list(UserEntity actor, UUID projectId) {
        projectAccessService.requireProjectRead(actor, projectId);
        return subdivisionRunRepository.findByProjectIdOrderByStartedAtDesc(projectId).stream().map(this::toDto).toList();
    }

    public SubdivisionDtos.SuggestResponse suggest(UserEntity actor, UUID projectId, SubdivisionDtos.SuggestRequest req) {
        projectAccessService.requireProjectRead(actor, projectId);

        DatasetEntity dataset = pickDataset(projectId).orElseThrow(() ->
                new ApiException(HttpStatus.BAD_REQUEST, "NO_DATASET", "Upload a cadastral GeoJSON dataset first"));

        String geoPath = dataset.getPreviewGeojsonPath() != null && !dataset.getPreviewGeojsonPath().isBlank()
                ? dataset.getPreviewGeojsonPath()
                : dataset.getStoredPath();
        Path datasetPath = storageService.getRoot().resolve(geoPath).normalize();

        Geometry boundary = geoJsonService.readFirstPolygonalGeometry(datasetPath);
        double boundaryAreaSqm = geoJsonService.areaSqm(boundary);
        if (!Double.isFinite(boundaryAreaSqm) || boundaryAreaSqm <= 0) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_GEOJSON", "Unable to compute boundary area");
        }

        int maxParcels = Math.max(1, (int) Math.floor(boundaryAreaSqm / req.minParcelArea()));
        Double estimated = null;
        if (req.targetParcels() != null && req.targetParcels() > 0) {
            estimated = boundaryAreaSqm / req.targetParcels();
        }

        return new SubdivisionDtos.SuggestResponse(boundaryAreaSqm, maxParcels, estimated);
    }

    public SubdivisionDtos.RunDetailDto getDetail(UserEntity actor, UUID runId) {
        SubdivisionRunEntity run = subdivisionRunRepository.findById(runId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Subdivision run not found"));

        projectAccessService.requireProjectRead(actor, run.getProject().getId());

        String geojson = null;
        if (run.getResultPath() != null) {
            try {
                geojson = Files.readString(storageService.getRoot().resolve(run.getResultPath()).normalize());
            } catch (IOException ignored) {
                geojson = null;
            }
        }

        String issuesJson = computeIssuesJson(run, geojson);
        return new SubdivisionDtos.RunDetailDto(toDto(run), geojson, issuesJson);
    }

    public Path getResultFile(UserEntity actor, UUID runId) {
        SubdivisionRunEntity run = subdivisionRunRepository.findById(runId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Subdivision run not found"));

        projectAccessService.requireProjectRead(actor, run.getProject().getId());

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
        var all = datasetRepository.findByProjectIdOrderByUploadedAtDesc(projectId);

        Optional<DatasetEntity> cadastral = all.stream()
                .filter(d -> d.getType() == DatasetType.CADASTRAL)
                .findFirst();

        if (cadastral.isPresent()) {
            return cadastral;
        }

        return all.stream().findFirst();
    }

    private void fail(SubdivisionRunEntity run, String errorMessage) {
        run.setStatus(RunStatus.FAILED);
        run.setErrorMessage(errorMessage);
        run.setFinishedAt(Instant.now());
        subdivisionRunRepository.save(run);
    }

    private String computeIssuesJson(SubdivisionRunEntity run, String geojson) {
        if (geojson == null || geojson.isBlank()) {
            return "[]";
        }

        try {
            var root = objectMapper.readTree(geojson);
            var features = root.path("features");
            if (!features.isArray()) {
                return "[]";
            }

            List<Geometry> geometries = new ArrayList<>();
            List<Integer> parcelNos = new ArrayList<>();

            int idx = 0;
            for (var f : features) {
                idx++;
                var geomNode = f.path("geometry");
                if (!geomNode.isObject()) {
                    continue;
                }
                Geometry g;
                try {
                    g = geoJsonService.toPolygonalGeometry(geomNode);
                } catch (Exception ex) {
                    continue;
                }
                if (g == null || g.isEmpty()) {
                    continue;
                }
                geometries.add(g);

                int parcelNo = f.path("properties").path("parcelNo").asInt(idx);
                parcelNos.add(parcelNo);
            }

            List<Map<String, Object>> issues = new ArrayList<>();

            if (geometries.size() != run.getTargetParcels()) {
                issues.add(Map.of(
                        "rule", "COUNT_MISMATCH",
                        "severity", "WARNING",
                        "message", "Result parcel count differs from target",
                        "targetParcels", run.getTargetParcels(),
                        "actualParcels", geometries.size()
                ));
            }

            for (int i = 0; i < geometries.size(); i++) {
                Geometry g = geometries.get(i);
                int no = parcelNos.get(i);

                if (!g.isValid()) {
                    issues.add(Map.of(
                            "rule", "INVALID_GEOMETRY",
                            "severity", "ERROR",
                            "message", "Parcel geometry is invalid",
                            "parcelNo", no
                    ));
                }

                double areaSqm = geoJsonService.areaSqm(g);
                if (Double.isFinite(areaSqm) && areaSqm > 0 && areaSqm < run.getMinParcelArea()) {
                    issues.add(Map.of(
                            "rule", "MIN_AREA",
                            "severity", "ERROR",
                            "message", "Parcel area is below minimum",
                            "parcelNo", no,
                            "areaSqm", areaSqm,
                            "minParcelArea", run.getMinParcelArea()
                    ));
                }
            }

            for (int i = 0; i < geometries.size(); i++) {
                Geometry a = geometries.get(i);
                int aNo = parcelNos.get(i);
                for (int j = i + 1; j < geometries.size(); j++) {
                    Geometry b = geometries.get(j);
                    int bNo = parcelNos.get(j);

                    Geometry inter;
                    try {
                        inter = a.intersection(b);
                    } catch (Exception ex) {
                        continue;
                    }
                    if (inter == null || inter.isEmpty()) {
                        continue;
                    }
                    double overlapSqm = geoJsonService.areaSqm(inter);
                    if (!Double.isFinite(overlapSqm) || overlapSqm <= 1.0) {
                        continue;
                    }

                    Map<String, Object> issue = new HashMap<>();
                    issue.put("rule", "OVERLAP");
                    issue.put("severity", "ERROR");
                    issue.put("message", "Parcels overlap");
                    issue.put("parcelA", aNo);
                    issue.put("parcelB", bNo);
                    issue.put("overlapSqm", overlapSqm);
                    issues.add(issue);

                    if (issues.size() >= 200) {
                        break;
                    }
                }
                if (issues.size() >= 200) {
                    break;
                }
            }

            return objectMapper.writeValueAsString(issues);
        } catch (Exception ex) {
            return "[]";
        }
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
