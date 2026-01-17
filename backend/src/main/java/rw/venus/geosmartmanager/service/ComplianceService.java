package rw.venus.geosmartmanager.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import rw.venus.geosmartmanager.api.dto.ComplianceDtos;
import rw.venus.geosmartmanager.domain.ComplianceStatus;
import rw.venus.geosmartmanager.domain.RunStatus;
import rw.venus.geosmartmanager.entity.ComplianceConfigEntity;
import rw.venus.geosmartmanager.entity.ComplianceCheckEntity;
import rw.venus.geosmartmanager.entity.ProjectEntity;
import rw.venus.geosmartmanager.entity.SubdivisionRunEntity;
import rw.venus.geosmartmanager.entity.UserEntity;
import rw.venus.geosmartmanager.exception.ApiException;
import rw.venus.geosmartmanager.repo.ComplianceCheckRepository;
import rw.venus.geosmartmanager.repo.ProjectRepository;
import rw.venus.geosmartmanager.repo.SubdivisionRunRepository;
import java.io.IOException;
import java.nio.file.Files;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

@Service
public class ComplianceService {
    private final ProjectRepository projectRepository;
    private final SubdivisionRunRepository subdivisionRunRepository;
    private final ComplianceCheckRepository complianceCheckRepository;
    private final ComplianceConfigService complianceConfigService;
    private final StorageService storageService;
    private final ObjectMapper objectMapper;
    private final AuditService auditService;

    public ComplianceService(
            ProjectRepository projectRepository,
            SubdivisionRunRepository subdivisionRunRepository,
            ComplianceCheckRepository complianceCheckRepository,
            ComplianceConfigService complianceConfigService,
            StorageService storageService,
            ObjectMapper objectMapper,
            AuditService auditService
    ) {
        this.projectRepository = projectRepository;
        this.subdivisionRunRepository = subdivisionRunRepository;
        this.complianceCheckRepository = complianceCheckRepository;
        this.complianceConfigService = complianceConfigService;
        this.storageService = storageService;
        this.objectMapper = objectMapper;
        this.auditService = auditService;
    }

    public ComplianceDtos.ComplianceDto check(UserEntity actor, UUID projectId, ComplianceDtos.CheckRequest req) {
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

                double areaSqm = computeAreaSqm(feature.path("geometry"));
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

    public List<ComplianceDtos.ComplianceDto> list(UUID projectId) {
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

    private double computeAreaSqm(JsonNode geometry) {
        if (geometry == null || !geometry.isObject()) {
            return Double.NaN;
        }

        String type = geometry.path("type").asText("");
        JsonNode coords = geometry.path("coordinates");
        if (!coords.isArray()) {
            return Double.NaN;
        }

        ArrayNode ring = null;
        if ("Polygon".equals(type)) {
            JsonNode ringNode = coords.path(0);
            if (ringNode.isArray()) {
                ring = (ArrayNode) ringNode;
            }
        } else if ("MultiPolygon".equals(type)) {
            JsonNode ringNode = coords.path(0).path(0);
            if (ringNode.isArray()) {
                ring = (ArrayNode) ringNode;
            }
        }

        if (ring == null || ring.size() < 4) {
            return Double.NaN;
        }

        double midLat = 0;
        int count = 0;
        for (JsonNode pt : ring) {
            if (pt.isArray() && pt.size() >= 2) {
                midLat += pt.path(1).asDouble(0);
                count++;
            }
        }
        if (count == 0) {
            return Double.NaN;
        }
        midLat /= count;

        double metersPerDegLat = 111_320.0;
        double metersPerDegLon = 111_320.0 * Math.cos(Math.toRadians(midLat));

        // Shoelace formula on equirectangular projected coords.
        double sum = 0;
        for (int i = 0; i < ring.size() - 1; i++) {
            JsonNode a = ring.get(i);
            JsonNode b = ring.get(i + 1);
            if (!a.isArray() || !b.isArray() || a.size() < 2 || b.size() < 2) {
                continue;
            }
            double ax = a.path(0).asDouble(0) * metersPerDegLon;
            double ay = a.path(1).asDouble(0) * metersPerDegLat;
            double bx = b.path(0).asDouble(0) * metersPerDegLon;
            double by = b.path(1).asDouble(0) * metersPerDegLat;
            sum += (ax * by) - (bx * ay);
        }

        return Math.abs(sum) / 2.0;
    }
}
