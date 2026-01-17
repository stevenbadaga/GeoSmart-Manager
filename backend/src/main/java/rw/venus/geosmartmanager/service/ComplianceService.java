package rw.venus.geosmartmanager.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import rw.venus.geosmartmanager.api.dto.ComplianceDtos;
import rw.venus.geosmartmanager.domain.ComplianceStatus;
import rw.venus.geosmartmanager.domain.RunStatus;
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
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

@Service
public class ComplianceService {
    private final ProjectRepository projectRepository;
    private final SubdivisionRunRepository subdivisionRunRepository;
    private final ComplianceCheckRepository complianceCheckRepository;
    private final StorageService storageService;
    private final ObjectMapper objectMapper;
    private final AuditService auditService;

    public ComplianceService(
            ProjectRepository projectRepository,
            SubdivisionRunRepository subdivisionRunRepository,
            ComplianceCheckRepository complianceCheckRepository,
            StorageService storageService,
            ObjectMapper objectMapper,
            AuditService auditService
    ) {
        this.projectRepository = projectRepository;
        this.subdivisionRunRepository = subdivisionRunRepository;
        this.complianceCheckRepository = complianceCheckRepository;
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

        JsonNode root;
        try {
            String geojson = Files.readString(storageService.getRoot().resolve(run.getResultPath()).normalize());
            root = objectMapper.readTree(geojson);
        } catch (IOException ex) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "COMPLIANCE_ERROR", "Unable to read subdivision result");
        }

        List<Map<String, Object>> issues = new ArrayList<>();
        JsonNode features = root.path("features");
        if (features.isArray()) {
            int idx = 0;
            for (JsonNode feature : features) {
                idx++;
                double areaSqm = feature.path("properties").path("areaSqm").asDouble(Double.NaN);
                if (!Double.isFinite(areaSqm) || areaSqm <= 0) {
                    issues.add(Map.of(
                            "type", "AREA_MISSING",
                            "message", "Parcel area is missing/invalid",
                            "parcelIndex", idx
                    ));
                    continue;
                }
                if (areaSqm < run.getMinParcelArea()) {
                    issues.add(Map.of(
                            "type", "MIN_AREA_VIOLATION",
                            "message", "Parcel area below minimum",
                            "parcelIndex", idx,
                            "areaSqm", areaSqm,
                            "minAreaSqm", run.getMinParcelArea()
                    ));
                }
            }
        }

        ComplianceStatus status = issues.isEmpty() ? ComplianceStatus.PASSED : ComplianceStatus.FAILED;
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
}

