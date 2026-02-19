package rw.venus.geosmartmanager.service;

import org.springframework.stereotype.Service;
import rw.venus.geosmartmanager.api.dto.ComplianceDtos;
import rw.venus.geosmartmanager.config.AppProperties;
import rw.venus.geosmartmanager.domain.ComplianceStatus;
import rw.venus.geosmartmanager.domain.DatasetType;
import rw.venus.geosmartmanager.entity.ComplianceCheckEntity;
import rw.venus.geosmartmanager.entity.DatasetEntity;
import rw.venus.geosmartmanager.entity.ProjectEntity;
import rw.venus.geosmartmanager.entity.SubdivisionRunEntity;
import rw.venus.geosmartmanager.repo.ComplianceCheckRepository;
import rw.venus.geosmartmanager.repo.DatasetRepository;
import rw.venus.geosmartmanager.repo.ProjectRepository;
import rw.venus.geosmartmanager.repo.SubdivisionRunRepository;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Service
public class ComplianceService {
    private final ComplianceCheckRepository complianceCheckRepository;
    private final ProjectRepository projectRepository;
    private final SubdivisionRunRepository subdivisionRunRepository;
    private final DatasetRepository datasetRepository;
    private final AppProperties appProperties;
    private final AuditService auditService;
    private final CurrentUserService currentUserService;
    private final GeoJsonService geoJsonService;

    public ComplianceService(ComplianceCheckRepository complianceCheckRepository,
                             ProjectRepository projectRepository,
                             SubdivisionRunRepository subdivisionRunRepository,
                             DatasetRepository datasetRepository,
                             AppProperties appProperties,
                             AuditService auditService,
                             CurrentUserService currentUserService,
                             GeoJsonService geoJsonService) {
        this.complianceCheckRepository = complianceCheckRepository;
        this.projectRepository = projectRepository;
        this.subdivisionRunRepository = subdivisionRunRepository;
        this.datasetRepository = datasetRepository;
        this.appProperties = appProperties;
        this.auditService = auditService;
        this.currentUserService = currentUserService;
        this.geoJsonService = geoJsonService;
    }

    public ComplianceCheckEntity runCompliance(Long projectId, ComplianceDtos.RunComplianceRequest request) {
        ProjectEntity project = projectRepository.findById(projectId)
                .orElseThrow(() -> new IllegalArgumentException("Project not found"));
        SubdivisionRunEntity run = subdivisionRunRepository.findById(request.subdivisionRunId())
                .orElseThrow(() -> new IllegalArgumentException("Subdivision run not found"));
        if (!run.getProject().getId().equals(project.getId())) {
            throw new IllegalArgumentException("Subdivision run does not belong to project");
        }

        List<String> findings = new ArrayList<>();
        ComplianceStatus status = ComplianceStatus.PASS;

        if (run.getParcelCount() > appProperties.getCompliance().getMaxParcelCount()) {
            status = ComplianceStatus.FAIL;
            findings.add("Parcel count exceeds allowed maximum");
        }

        List<GeoJsonService.ParcelStats> parcelStats = new ArrayList<>();
        for (List<GeoJsonService.Point> polygon : geoJsonService.extractPolygons(run.getResultGeoJson())) {
            parcelStats.add(geoJsonService.computeParcelStats(polygon));
        }

        double minArea = parcelStats.stream().mapToDouble(GeoJsonService.ParcelStats::areaSqm).min().orElse(0);
        double maxArea = parcelStats.stream().mapToDouble(GeoJsonService.ParcelStats::areaSqm).max().orElse(0);
        double maxAspect = parcelStats.stream().mapToDouble(GeoJsonService.ParcelStats::aspectRatio).max().orElse(0);

        if (minArea > 0 && minArea < appProperties.getCompliance().getMinParcelAreaSqm()) {
            status = status == ComplianceStatus.FAIL ? ComplianceStatus.FAIL : ComplianceStatus.WARN;
            findings.add("Minimum parcel area below RLMUA threshold");
        }

        if (maxArea > appProperties.getCompliance().getMaxParcelAreaSqm()) {
            status = ComplianceStatus.FAIL;
            findings.add("Parcel area exceeds maximum threshold");
        }

        if (maxAspect > appProperties.getCompliance().getMaxParcelAspectRatio()) {
            status = status == ComplianceStatus.FAIL ? ComplianceStatus.FAIL : ComplianceStatus.WARN;
            findings.add("Parcel aspect ratio exceeds recommended limit");
        }

        boolean outsideRwanda = parcelStats.isEmpty() ? false : isOutsideRwanda(run.getResultGeoJson());
        if (outsideRwanda) {
            status = ComplianceStatus.FAIL;
            findings.add("Geometry outside Rwanda boundary");
        }

        boolean masterPlanMissing = false;
        GeoJsonService.BoundingBox masterPlanBounds = null;
        List<DatasetEntity> masterPlans = datasetRepository.findByProjectIdAndType(project.getId(), DatasetType.MASTER_PLAN);
        if (masterPlans.isEmpty()) {
            masterPlanMissing = true;
        } else {
            for (DatasetEntity dataset : masterPlans) {
                GeoJsonService.BoundingBox bounds = geoJsonService.analyze(dataset.getGeoJson()).bounds();
                if (bounds != null) {
                    masterPlanBounds = masterPlanBounds == null ? bounds : masterPlanBounds.merge(bounds);
                }
            }
        }

        if (masterPlanBounds != null) {
            GeoJsonService.BoundingBox runBounds = geoJsonService.analyze(run.getResultGeoJson()).bounds();
            if (runBounds != null && !isWithinBounds(masterPlanBounds, runBounds)) {
                status = ComplianceStatus.FAIL;
                findings.add("Subdivision output extends outside master plan boundary");
            }
        } else if (masterPlanMissing) {
            status = status == ComplianceStatus.FAIL ? ComplianceStatus.FAIL : ComplianceStatus.WARN;
            findings.add("Master plan dataset not provided; boundary check skipped");
        }

        if (findings.isEmpty()) {
            findings.add("All checks passed based on configured RLMUA thresholds");
        }

        ComplianceCheckEntity check = ComplianceCheckEntity.builder()
                .project(project)
                .subdivisionRun(run)
                .status(status)
                .findings(String.join("; ", findings))
                .checkedAt(Instant.now())
                .build();
        complianceCheckRepository.save(check);
        auditService.log(currentUserService.getCurrentUserEmail(), "CHECK", "Compliance", check.getId(), check.getFindings());
        return check;
    }

    public List<ComplianceCheckEntity> listChecks(Long projectId) {
        return complianceCheckRepository.findByProjectId(projectId);
    }

    private boolean isOutsideRwanda(String geoJson) {
        double minLat = -2.84;
        double maxLat = -1.05;
        double minLon = 28.86;
        double maxLon = 30.9;

        for (List<GeoJsonService.Point> polygon : geoJsonService.extractPolygons(geoJson)) {
            for (GeoJsonService.Point point : polygon) {
                if (point.lat() < minLat || point.lat() > maxLat || point.lon() < minLon || point.lon() > maxLon) {
                    return true;
                }
            }
        }
        return false;
    }

    private boolean isWithinBounds(GeoJsonService.BoundingBox outer, GeoJsonService.BoundingBox inner) {
        return inner.minLat() >= outer.minLat()
                && inner.maxLat() <= outer.maxLat()
                && inner.minLon() >= outer.minLon()
                && inner.maxLon() <= outer.maxLon();
    }
}
