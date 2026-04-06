package rw.venus.geosmartmanager.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
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

import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Optional;

@Service
public class ComplianceService {
    private static final DateTimeFormatter ISO_INSTANT = DateTimeFormatter.ISO_INSTANT;
    private static final DateTimeFormatter PACKAGE_ID_TIME = DateTimeFormatter.ofPattern("yyyyMMddHHmmss").withZone(ZoneId.of("Africa/Kigali"));
    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();
    private static final TypeReference<List<ComplianceDtos.ComplianceRuleResult>> RULE_RESULTS_TYPE = new TypeReference<>() {};

    private static final List<ComplianceDtos.RegulatoryUpdateResponse> DEFAULT_UPDATES = List.of(
            new ComplianceDtos.RegulatoryUpdateResponse(
                    "RLMUA-DEFAULT-01",
                    "Evidence package traceability",
                    "RLMUA-LS 8.4",
                    "2025-01-01",
                    "Attach rule-level compliance outputs with clause references in every submission package."
            ),
            new ComplianceDtos.RegulatoryUpdateResponse(
                    "RLMUA-DEFAULT-02",
                    "Master plan boundary strictness",
                    "NMP-CAD 3.2",
                    "2025-06-01",
                    "Subdivisions extending beyond approved master plan bounds require correction before filing."
            )
    );

    private static final List<String> REQUIRED_ATTACHMENTS = List.of(
            "Signed parcel layout map",
            "Subdivision GeoJSON dataset",
            "Land ownership or deed reference",
            "Compliance findings and remediation notes",
            "Professional license declaration"
    );

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

        List<ComplianceDtos.ComplianceRuleResult> ruleResults = new ArrayList<>();

        List<GeoJsonService.ParcelStats> parcelStats = new ArrayList<>();
        for (List<GeoJsonService.Point> polygon : geoJsonService.extractPolygons(run.getResultGeoJson())) {
            parcelStats.add(geoJsonService.computeParcelStats(polygon));
        }
        boolean hasParcels = !parcelStats.isEmpty();

        addRuleResult(
                ruleResults,
                "GEOMETRY_COMPLETENESS",
                "Parcel geometry extraction",
                "RLMUA-DATA 2.4",
                hasParcels ? ComplianceStatus.PASS : ComplianceStatus.FAIL,
                hasParcels
                        ? "Subdivision geometry contains " + parcelStats.size() + " parcel polygons."
                        : "No parcel polygons were detected in the subdivision output.",
                hasParcels
                        ? "No action required."
                        : "Re-run subdivision with valid polygon geometry before submission."
        );

        int maxParcelCount = appProperties.getCompliance().getMaxParcelCount();
        boolean parcelCountExceeded = run.getParcelCount() > maxParcelCount;
        addRuleResult(
                ruleResults,
                "PARCEL_COUNT_LIMIT",
                "Maximum parcel count",
                "RLMUA-LS 4.2",
                parcelCountExceeded ? ComplianceStatus.FAIL : ComplianceStatus.PASS,
                parcelCountExceeded
                        ? "Parcel count " + run.getParcelCount() + " exceeds maximum " + maxParcelCount + "."
                        : "Parcel count " + run.getParcelCount() + " is within maximum " + maxParcelCount + ".",
                parcelCountExceeded
                        ? "Reduce parcel count or split submission into compliant phases."
                        : "No action required."
        );

        double minArea = parcelStats.stream().mapToDouble(GeoJsonService.ParcelStats::areaSqm).min().orElse(0);
        double maxArea = parcelStats.stream().mapToDouble(GeoJsonService.ParcelStats::areaSqm).max().orElse(0);
        double maxAspect = parcelStats.stream().mapToDouble(GeoJsonService.ParcelStats::aspectRatio).max().orElse(0);
        double minAllowedArea = appProperties.getCompliance().getMinParcelAreaSqm();
        double maxAllowedArea = appProperties.getCompliance().getMaxParcelAreaSqm();
        double maxAllowedAspect = appProperties.getCompliance().getMaxParcelAspectRatio();

        ComplianceStatus minAreaStatus = !hasParcels
                ? ComplianceStatus.WARN
                : (minArea < minAllowedArea ? ComplianceStatus.WARN : ComplianceStatus.PASS);
        addRuleResult(
                ruleResults,
                "MIN_PARCEL_AREA",
                "Minimum parcel area",
                "RLMUA-LS 5.1",
                minAreaStatus,
                !hasParcels
                        ? "Area validation was skipped because no parcels were detected."
                        : (minArea < minAllowedArea
                        ? "Minimum parcel area " + formatNumber(minArea) + " sqm is below threshold " + formatNumber(minAllowedArea) + " sqm."
                        : "Minimum parcel area " + formatNumber(minArea) + " sqm meets threshold " + formatNumber(minAllowedArea) + " sqm."),
                minAreaStatus == ComplianceStatus.PASS
                        ? "No action required."
                        : "Merge or resize undersized parcels to satisfy minimum area."
        );

        ComplianceStatus maxAreaStatus = !hasParcels
                ? ComplianceStatus.WARN
                : (maxArea > maxAllowedArea ? ComplianceStatus.FAIL : ComplianceStatus.PASS);
        addRuleResult(
                ruleResults,
                "MAX_PARCEL_AREA",
                "Maximum parcel area",
                "RLMUA-LS 5.2",
                maxAreaStatus,
                !hasParcels
                        ? "Area validation was skipped because no parcels were detected."
                        : (maxArea > maxAllowedArea
                        ? "Maximum parcel area " + formatNumber(maxArea) + " sqm exceeds threshold " + formatNumber(maxAllowedArea) + " sqm."
                        : "Maximum parcel area " + formatNumber(maxArea) + " sqm is within threshold " + formatNumber(maxAllowedArea) + " sqm."),
                maxAreaStatus == ComplianceStatus.PASS
                        ? "No action required."
                        : "Split oversized parcels before submission."
        );

        ComplianceStatus aspectStatus = !hasParcels
                ? ComplianceStatus.WARN
                : (maxAspect > maxAllowedAspect ? ComplianceStatus.WARN : ComplianceStatus.PASS);
        addRuleResult(
                ruleResults,
                "PARCEL_ASPECT_RATIO",
                "Parcel shape proportionality",
                "RLMUA-LS 5.3",
                aspectStatus,
                !hasParcels
                        ? "Aspect ratio validation was skipped because no parcels were detected."
                        : (maxAspect > maxAllowedAspect
                        ? "Maximum aspect ratio " + formatNumber(maxAspect) + " exceeds recommended " + formatNumber(maxAllowedAspect) + "."
                        : "Maximum aspect ratio " + formatNumber(maxAspect) + " is within recommended " + formatNumber(maxAllowedAspect) + "."),
                aspectStatus == ComplianceStatus.PASS
                        ? "No action required."
                        : "Adjust elongated parcels to improve frontage and access quality."
        );

        boolean outsideRwanda = parcelStats.isEmpty() ? false : isOutsideRwanda(run.getResultGeoJson());
        ComplianceStatus rwandaBoundaryStatus = !hasParcels
                ? ComplianceStatus.WARN
                : (outsideRwanda ? ComplianceStatus.FAIL : ComplianceStatus.PASS);
        addRuleResult(
                ruleResults,
                "RWANDA_BOUNDARY",
                "National boundary alignment",
                "NMP-CAD 3.1",
                rwandaBoundaryStatus,
                !hasParcels
                        ? "Boundary check was skipped because no parcels were detected."
                        : (outsideRwanda
                        ? "One or more parcel vertices fall outside Rwanda boundary extents."
                        : "All parcel vertices are inside Rwanda boundary extents."),
                rwandaBoundaryStatus == ComplianceStatus.PASS
                        ? "No action required."
                        : "Correct geometry coordinates and clip output to Rwanda boundary."
        );

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

        ComplianceStatus masterPlanStatus;
        String masterPlanDetail;
        String masterPlanSuggestion;
        if (masterPlanBounds != null) {
            GeoJsonService.BoundingBox runBounds = geoJsonService.analyze(run.getResultGeoJson()).bounds();
            boolean extendsOutside = runBounds != null && !isWithinBounds(masterPlanBounds, runBounds);
            masterPlanStatus = extendsOutside ? ComplianceStatus.FAIL : ComplianceStatus.PASS;
            masterPlanDetail = extendsOutside
                    ? "Subdivision output extends outside master plan boundary."
                    : "Subdivision output remains within provided master plan boundary.";
            masterPlanSuggestion = extendsOutside
                    ? "Clip or redesign parcels to fit approved master plan extent."
                    : "No action required.";
        } else if (masterPlanMissing) {
            masterPlanStatus = ComplianceStatus.WARN;
            masterPlanDetail = "Master plan dataset not provided; boundary check was skipped.";
            masterPlanSuggestion = "Upload a master plan dataset for strict boundary validation.";
        } else {
            masterPlanStatus = ComplianceStatus.WARN;
            masterPlanDetail = "Master plan boundary could not be derived from provided dataset.";
            masterPlanSuggestion = "Review master plan geometry and rerun compliance validation.";
        }
        addRuleResult(
                ruleResults,
                "MASTER_PLAN_BOUNDARY",
                "Master plan boundary compliance",
                "NMP-CAD 3.2",
                masterPlanStatus,
                masterPlanDetail,
                masterPlanSuggestion
        );

        ComplianceStatus status = deriveOverallStatus(ruleResults);
        String findingsSummary = summarizeFindings(ruleResults);
        String frameworkVersion = resolveFrameworkVersion();

        ComplianceCheckEntity check = ComplianceCheckEntity.builder()
                .project(project)
                .subdivisionRun(run)
                .status(status)
                .findings(findingsSummary)
                .detailsJson(serializeRuleResults(ruleResults))
                .frameworkVersion(frameworkVersion)
                .checkedAt(Instant.now())
                .build();
        complianceCheckRepository.save(check);
        auditService.log(currentUserService.getCurrentUserEmail(), "CHECK", "Compliance", check.getId(), check.getFindings());
        return check;
    }

    public List<ComplianceCheckEntity> listChecks(Long projectId) {
        return complianceCheckRepository.findByProjectId(projectId);
    }

    public ComplianceDtos.ComplianceResponse liveCheck(Long projectId, Long subdivisionRunId, Long maxAgeSeconds) {
        SubdivisionRunEntity run = subdivisionRunRepository.findById(subdivisionRunId)
                .orElseThrow(() -> new IllegalArgumentException("Subdivision run not found"));
        if (!run.getProject().getId().equals(projectId)) {
            throw new IllegalArgumentException("Subdivision run does not belong to project");
        }

        long ttlSeconds = maxAgeSeconds == null ? 45 : Math.max(5, Math.min(600, maxAgeSeconds));
        Optional<ComplianceCheckEntity> latest = complianceCheckRepository
                .findTopByProjectIdAndSubdivisionRunIdOrderByCheckedAtDesc(projectId, subdivisionRunId);
        Instant now = Instant.now();
        if (latest.isPresent()
                && latest.get().getCheckedAt() != null
                && latest.get().getCheckedAt().plusSeconds(ttlSeconds).isAfter(now)) {
            return toResponse(latest.get());
        }

        ComplianceCheckEntity check = runCompliance(projectId, new ComplianceDtos.RunComplianceRequest(subdivisionRunId));
        return toResponse(check);
    }

    public ComplianceDtos.ComplianceResponse toResponse(ComplianceCheckEntity entity) {
        return new ComplianceDtos.ComplianceResponse(
                entity.getId(),
                entity.getProject().getId(),
                entity.getSubdivisionRun().getId(),
                entity.getStatus(),
                entity.getFindings(),
                entity.getFrameworkVersion(),
                entity.getCheckedAt() == null ? null : ISO_INSTANT.format(entity.getCheckedAt()),
                deserializeRuleResults(entity)
        );
    }

    public List<ComplianceDtos.RegulatoryUpdateResponse> listRegulatoryUpdates() {
        List<AppProperties.RegulatoryUpdate> configured = Optional.ofNullable(appProperties.getCompliance().getUpdates())
                .orElse(List.of());
        if (configured.isEmpty()) {
            return DEFAULT_UPDATES;
        }
        return configured.stream()
                .map(update -> new ComplianceDtos.RegulatoryUpdateResponse(
                        valueOrFallback(update.getId(), "CONFIG-" + Math.abs(update.hashCode())),
                        valueOrFallback(update.getTitle(), "Regulatory update"),
                        valueOrFallback(update.getClauseReference(), "N/A"),
                        valueOrFallback(update.getEffectiveDate(), ""),
                        valueOrFallback(update.getSummary(), "No summary provided.")
                ))
                .sorted(Comparator.comparing(ComplianceDtos.RegulatoryUpdateResponse::effectiveDate, Comparator.nullsLast(Comparator.reverseOrder())))
                .toList();
    }

    public ComplianceDtos.SubmissionPackageResponse buildSubmissionPackage(Long projectId, Long checkId) {
        ComplianceCheckEntity check = getCheck(projectId, checkId);
        List<ComplianceDtos.ComplianceRuleResult> ruleResults = deserializeRuleResults(check);
        String packageId = "PKG-" + check.getProject().getCode() + "-" + check.getId() + "-" + PACKAGE_ID_TIME.format(Instant.now());
        String notes = switch (check.getStatus()) {
            case PASS -> "Package is ready for regulatory submission.";
            case WARN -> "Submission can proceed with documented remediation notes for warning items.";
            case FAIL -> "Resolve failed compliance rules before submission.";
        };

        return new ComplianceDtos.SubmissionPackageResponse(
                packageId,
                check.getProject().getId(),
                check.getId(),
                check.getProject().getCode(),
                check.getProject().getName(),
                ISO_INSTANT.format(Instant.now()),
                valueOrFallback(check.getFrameworkVersion(), resolveFrameworkVersion()),
                check.getStatus(),
                check.getFindings(),
                ruleResults,
                REQUIRED_ATTACHMENTS,
                notes
        );
    }

    public ComplianceDtos.CertificateTemplateResponse buildCertificateTemplate(Long projectId, Long checkId) {
        ComplianceCheckEntity check = getCheck(projectId, checkId);
        String templateId = "CERT-TEMPLATE-" + check.getProject().getCode() + "-" + check.getId();
        String statement = switch (check.getStatus()) {
            case PASS ->
                    "This template certifies that project outputs satisfy configured compliance checks under " +
                            valueOrFallback(check.getFrameworkVersion(), resolveFrameworkVersion()) +
                            ". Final approval remains subject to regulator review.";
            case WARN ->
                    "This template records conditional compliance with warning items requiring remediation notes. " +
                            "Final approval remains subject to regulator review.";
            case FAIL ->
                    "This template indicates non-compliance. Failed checks must be resolved before certification can be issued.";
        };

        return new ComplianceDtos.CertificateTemplateResponse(
                templateId,
                check.getProject().getId(),
                check.getId(),
                check.getProject().getCode(),
                check.getProject().getName(),
                ISO_INSTANT.format(Instant.now()),
                valueOrFallback(check.getFrameworkVersion(), resolveFrameworkVersion()),
                check.getStatus(),
                statement,
                List.of(
                        "Project Manager (Name & Signature)",
                        "Licensed Surveyor (Name, License, Signature)",
                        "Regulatory Reviewer (Authority Signature)"
                )
        );
    }

    private ComplianceCheckEntity getCheck(Long projectId, Long checkId) {
        return complianceCheckRepository.findByIdAndProjectId(checkId, projectId)
                .orElseThrow(() -> new IllegalArgumentException("Compliance check not found"));
    }

    private ComplianceStatus deriveOverallStatus(List<ComplianceDtos.ComplianceRuleResult> ruleResults) {
        ComplianceStatus status = ComplianceStatus.PASS;
        for (ComplianceDtos.ComplianceRuleResult result : ruleResults) {
            if (result.status() == ComplianceStatus.FAIL) {
                return ComplianceStatus.FAIL;
            }
            if (result.status() == ComplianceStatus.WARN) {
                status = ComplianceStatus.WARN;
            }
        }
        return status;
    }

    private String summarizeFindings(List<ComplianceDtos.ComplianceRuleResult> ruleResults) {
        List<String> nonPassSummaries = ruleResults.stream()
                .filter(result -> result.status() != ComplianceStatus.PASS)
                .map(result -> result.ruleCode() + ": " + result.detail())
                .toList();
        if (nonPassSummaries.isEmpty()) {
            return "All checks passed based on configured RLMUA thresholds";
        }
        return String.join("; ", nonPassSummaries);
    }

    private void addRuleResult(List<ComplianceDtos.ComplianceRuleResult> ruleResults,
                               String ruleCode,
                               String ruleName,
                               String clauseReference,
                               ComplianceStatus status,
                               String detail,
                               String suggestion) {
        ruleResults.add(new ComplianceDtos.ComplianceRuleResult(
                ruleCode,
                ruleName,
                clauseReference,
                status,
                detail,
                suggestion
        ));
    }

    private String serializeRuleResults(List<ComplianceDtos.ComplianceRuleResult> ruleResults) {
        try {
            return OBJECT_MAPPER.writeValueAsString(ruleResults);
        } catch (Exception ignored) {
            return "[]";
        }
    }

    private List<ComplianceDtos.ComplianceRuleResult> deserializeRuleResults(ComplianceCheckEntity entity) {
        if (entity.getDetailsJson() != null && !entity.getDetailsJson().isBlank()) {
            try {
                List<ComplianceDtos.ComplianceRuleResult> parsed = OBJECT_MAPPER.readValue(entity.getDetailsJson(), RULE_RESULTS_TYPE);
                if (parsed != null && !parsed.isEmpty()) {
                    return parsed;
                }
            } catch (Exception ignored) {
                // Fall through to legacy fallback.
            }
        }

        return List.of(new ComplianceDtos.ComplianceRuleResult(
                "LEGACY_SUMMARY",
                "Legacy compliance summary",
                "N/A",
                entity.getStatus(),
                entity.getFindings(),
                "Run compliance validation again to generate clause-level findings and suggestions."
        ));
    }

    private String resolveFrameworkVersion() {
        return valueOrFallback(appProperties.getCompliance().getFrameworkVersion(), "RLMUA-Default");
    }

    private String valueOrFallback(String value, String fallback) {
        if (value == null || value.isBlank()) {
            return fallback;
        }
        return value;
    }

    private String formatNumber(double value) {
        return String.format(Locale.ROOT, "%.2f", value);
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
