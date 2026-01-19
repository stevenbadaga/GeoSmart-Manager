package rw.venus.geosmartmanager.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import rw.venus.geosmartmanager.api.dto.ComplianceDtos;
import rw.venus.geosmartmanager.domain.ComplianceStatus;
import rw.venus.geosmartmanager.domain.DatasetType;
import rw.venus.geosmartmanager.domain.RunStatus;
import rw.venus.geosmartmanager.entity.ComplianceConfigEntity;
import rw.venus.geosmartmanager.entity.ComplianceCheckEntity;
import rw.venus.geosmartmanager.entity.DatasetEntity;
import rw.venus.geosmartmanager.entity.ProjectEntity;
import rw.venus.geosmartmanager.entity.SubdivisionRunEntity;
import rw.venus.geosmartmanager.entity.UserEntity;
import rw.venus.geosmartmanager.exception.ApiException;
import rw.venus.geosmartmanager.repo.ComplianceCheckRepository;
import rw.venus.geosmartmanager.repo.DatasetRepository;
import rw.venus.geosmartmanager.repo.ProjectRepository;
import rw.venus.geosmartmanager.repo.SubdivisionRunRepository;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.locationtech.jts.geom.Geometry;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

@Service
public class ComplianceService {
    private final ProjectRepository projectRepository;
    private final SubdivisionRunRepository subdivisionRunRepository;
    private final ComplianceCheckRepository complianceCheckRepository;
    private final ComplianceConfigService complianceConfigService;
    private final DatasetRepository datasetRepository;
    private final StorageService storageService;
    private final ObjectMapper objectMapper;
    private final GeoJsonService geoJsonService;
    private final ProjectAccessService projectAccessService;
    private final AuditService auditService;

    public ComplianceService(
            ProjectRepository projectRepository,
            SubdivisionRunRepository subdivisionRunRepository,
            ComplianceCheckRepository complianceCheckRepository,
            ComplianceConfigService complianceConfigService,
            DatasetRepository datasetRepository,
            StorageService storageService,
            ObjectMapper objectMapper,
            GeoJsonService geoJsonService,
            ProjectAccessService projectAccessService,
            AuditService auditService
    ) {
        this.projectRepository = projectRepository;
        this.subdivisionRunRepository = subdivisionRunRepository;
        this.complianceCheckRepository = complianceCheckRepository;
        this.complianceConfigService = complianceConfigService;
        this.datasetRepository = datasetRepository;
        this.storageService = storageService;
        this.objectMapper = objectMapper;
        this.geoJsonService = geoJsonService;
        this.projectAccessService = projectAccessService;
        this.auditService = auditService;
    }

    public ComplianceDtos.ComplianceDto check(UserEntity actor, UUID projectId, ComplianceDtos.CheckRequest req) {
        projectAccessService.requireProjectWrite(actor, projectId);

        ProjectEntity project = projectRepository.findById(projectId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Project not found"));
        SubdivisionRunEntity run = subdivisionRunRepository.findById(req.subdivisionRunId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Subdivision run not found"));

        if (!run.getProject().getId().equals(project.getId())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_RUN", "Subdivision run does not belong to project");
        }
        if (run.getStatus() != RunStatus.COMPLETED || run.getResultPath() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "RUN_NOT_READY", "Subdivision run is not completed");
        }

        ComplianceConfigEntity config = complianceConfigService.getOrCreate(projectId);

        DatasetEntity masterPlanDataset = datasetRepository
                .findFirstByProjectIdAndTypeOrderByUploadedAtDesc(projectId, DatasetType.MASTER_PLAN)
                .orElse(null);

        List<GeoJsonService.PolygonalFeature> masterPlanZones = List.of();
        if (masterPlanDataset != null) {
            Path p = storageService.getRoot().resolve(masterPlanDataset.getStoredPath()).normalize();
            try {
                masterPlanZones = geoJsonService.readPolygonalFeatures(p);
            } catch (ApiException ex) {
                // Keep the compliance check usable even if an overlay file is malformed.
                masterPlanZones = List.of();
            }
        }

        JsonNode root;
        try {
            String geojson = Files.readString(storageService.getRoot().resolve(run.getResultPath()).normalize());
            root = objectMapper.readTree(geojson);
        } catch (IOException ex) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "COMPLIANCE_ERROR", "Unable to read subdivision result");
        }

        List<Map<String, Object>> issues = new ArrayList<>();
        boolean hasError = false;

        JsonNode features = root.path("features");
        if (features.isArray()) {
            Integer expectedCount = config.getExpectedParcelCount();
            if (expectedCount != null && features.size() != expectedCount) {
                issues.add(Map.of(
                        "rule", "PARCEL_COUNT",
                        "severity", "WARNING",
                        "message", "Parcel count does not match expected count",
                        "expected", expectedCount,
                        "actual", features.size()
                ));
            }

            Set<Integer> parcelNos = new HashSet<>();
            int idx = 0;
            for (JsonNode feature : features) {
                idx++;
                int parcelNo = feature.path("properties").path("parcelNo").asInt(idx);

                if (feature.path("properties").path("parcelNo").isMissingNode()) {
                    issues.add(Map.of(
                            "rule", "PARCEL_NO",
                            "severity", "WARNING",
                            "message", "Parcel number is missing; using index instead",
                            "parcelIndex", idx
                    ));
                }

                if (!parcelNos.add(parcelNo)) {
                    hasError = true;
                    issues.add(Map.of(
                            "rule", "DUPLICATE_PARCEL_NO",
                            "severity", "ERROR",
                            "message", "Duplicate parcel number detected",
                            "parcelNo", parcelNo
                    ));
                }

                Geometry parcelGeom;
                double areaSqm;
                try {
                    parcelGeom = geoJsonService.toPolygonalGeometry(feature.path("geometry"));
                    areaSqm = geoJsonService.areaSqm(parcelGeom);
                } catch (ApiException ex) {
                    hasError = true;
                    issues.add(Map.of(
                            "rule", "AREA",
                            "severity", "ERROR",
                            "message", "Unable to compute parcel area",
                            "parcelNo", parcelNo
                    ));
                    continue;
                }
                if (!Double.isFinite(areaSqm) || areaSqm <= 0) {
                    hasError = true;
                    issues.add(Map.of(
                            "rule", "AREA",
                            "severity", "ERROR",
                            "message", "Unable to compute parcel area",
                            "parcelNo", parcelNo
                    ));
                    continue;
                }

                if (areaSqm < config.getMinParcelArea()) {
                    hasError = true;
                    issues.add(Map.of(
                            "rule", "MIN_AREA",
                            "severity", "ERROR",
                            "message", "Parcel area below minimum",
                            "parcelNo", parcelNo,
                            "areaSqm", areaSqm,
                            "minAreaSqm", config.getMinParcelArea()
                    ));
                }

                if (config.getMaxParcelArea() != null && areaSqm > config.getMaxParcelArea()) {
                    issues.add(Map.of(
                            "rule", "MAX_AREA",
                            "severity", "WARNING",
                            "message", "Parcel area above maximum",
                            "parcelNo", parcelNo,
                            "areaSqm", areaSqm,
                            "maxAreaSqm", config.getMaxParcelArea()
                    ));
                }

                if (!masterPlanZones.isEmpty()) {
                    int zoneIdx = 0;
                    for (GeoJsonService.PolygonalFeature zone : masterPlanZones) {
                        zoneIdx++;
                        Geometry inter;
                        try {
                            inter = parcelGeom.intersection(zone.geometry());
                        } catch (Exception ignored) {
                            continue;
                        }
                        if (inter == null || inter.isEmpty()) {
                            continue;
                        }

                        double overlapSqm = geoJsonService.areaSqm(inter);
                        if (!Double.isFinite(overlapSqm) || overlapSqm <= 1.0) {
                            continue;
                        }

                        String zoneName = zone.properties() == null ? "" : zone.properties().path("name").asText("");
                        if (zoneName.isBlank() && zone.properties() != null) {
                            zoneName = zone.properties().path("zone").asText("");
                        }
                        if (zoneName.isBlank() && zone.properties() != null) {
                            zoneName = zone.properties().path("type").asText("");
                        }
                        if (zoneName.isBlank()) {
                            zoneName = "Zone " + zoneIdx;
                        }

                        String severity = "WARNING";
                        if (zone.properties() != null) {
                            String s = zone.properties().path("severity").asText("");
                            if ("ERROR".equalsIgnoreCase(s)) {
                                severity = "ERROR";
                            } else if ("WARNING".equalsIgnoreCase(s)) {
                                severity = "WARNING";
                            }

                            boolean restricted = zone.properties().path("restricted").asBoolean(false)
                                    || zone.properties().path("isRestricted").asBoolean(false);
                            if (restricted) {
                                severity = "ERROR";
                            }
                        }

                        if ("ERROR".equalsIgnoreCase(severity)) {
                            hasError = true;
                        }

                        issues.add(Map.of(
                                "rule", "MASTER_PLAN_OVERLAP",
                                "severity", severity,
                                "message", "Parcel intersects master plan zone",
                                "parcelNo", parcelNo,
                                "zone", zoneName,
                                "overlapSqm", overlapSqm,
                                "datasetId", masterPlanDataset.getId()
                        ));

                        if (issues.size() >= 250) {
                            break;
                        }
                    }
                }
            }
        }

        ComplianceStatus status;
        if (issues.isEmpty()) {
            status = ComplianceStatus.PASSED;
        } else if (hasError) {
            status = ComplianceStatus.FAILED;
        } else {
            status = ComplianceStatus.WARNINGS;
        }
        ComplianceCheckEntity check = new ComplianceCheckEntity();
        check.setProject(project);
        check.setSubdivisionRun(run);
        check.setStatus(status);
        check.setIssuesJson(writeJson(issues));
        check = complianceCheckRepository.save(check);

        auditService.log(actor, "COMPLIANCE_CHECK_CREATED", "ComplianceCheck", check.getId(), Map.of(
                "subdivisionRunId", run.getId(),
                "status", status.name()
        ));

        return new ComplianceDtos.ComplianceDto(
                check.getId(),
                project.getId(),
                run.getId(),
                check.getStatus(),
                check.getIssuesJson(),
                check.getCheckedAt()
        );
    }

    public List<ComplianceDtos.ComplianceDto> list(UserEntity actor, UUID projectId) {
        projectAccessService.requireProjectRead(actor, projectId);
        return complianceCheckRepository.findByProjectIdOrderByCheckedAtDesc(projectId).stream().map(c ->
                new ComplianceDtos.ComplianceDto(
                        c.getId(),
                        c.getProject().getId(),
                        c.getSubdivisionRun().getId(),
                        c.getStatus(),
                        c.getIssuesJson(),
                        c.getCheckedAt()
                )
        ).toList();
    }

    private String writeJson(Object obj) {
        try {
            return objectMapper.writeValueAsString(obj);
        } catch (Exception ex) {
            return "[]";
        }
    }
}
