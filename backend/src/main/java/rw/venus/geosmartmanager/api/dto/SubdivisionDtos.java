package rw.venus.geosmartmanager.api.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.NotBlank;
import rw.venus.geosmartmanager.domain.DatasetSourceFormat;
import rw.venus.geosmartmanager.domain.DatasetType;
import rw.venus.geosmartmanager.domain.SubdivisionOptimizationMode;
import rw.venus.geosmartmanager.domain.SubdivisionStatus;

import java.time.Instant;
import java.util.List;

public class SubdivisionDtos {
    public record RunSubdivisionRequest(
            @NotNull Long datasetId,
            @Min(1) int parcelCount,
            SubdivisionOptimizationMode optimizationMode
    ) {}

    public record SubdivisionRunResponse(
            Long id,
            Long projectId,
            Long datasetId,
            SubdivisionStatus status,
            SubdivisionOptimizationMode optimizationMode,
            int parcelCount,
            double avgParcelAreaSqm,
            double qualityScore,
            String resultGeoJson,
            AiExplanation aiExplanation,
            String parentUpi,
            String proposedLandUse,
            String parentParcelGeoJson,
            ValidationSummary validationSummary,
            Instant createdAt
    ) {}

    public record AiExplanation(
            double compactnessScore,
            double areaUniformityScore,
            double roadAccessScore,
            double complianceReadinessScore,
            String recommendation,
            String rationale
    ) {}

    public record DemoLayerResponse(
            Long datasetId,
            String layerKey,
            String name,
            DatasetType type,
            DatasetSourceFormat sourceFormat,
            String geoJson
    ) {}

    public record ZoningRule(
            String zoneCode,
            List<String> allowedLandUses,
            double minimumPlotSizeSqm,
            double frontSetbackM,
            double sideSetbackM,
            double maximumCoveragePct,
            double far,
            double heightLimitM
    ) {}

    public record ParentParcelResponse(
            String upi,
            String district,
            String sector,
            String cell,
            String village,
            String currentLandUse,
            double areaSqm,
            String geoJson,
            ZoningRule zoningRule
    ) {}

    public record DemoBundleResponse(
            Long projectId,
            List<DemoLayerResponse> layers,
            List<ParentParcelResponse> parentParcels,
            List<String> supportedFutureImports,
            String sampleProposalGeoJson
    ) {}

    public record ValidateSubdivisionRequest(
            @NotBlank String parentUpi,
            @NotBlank String proposedLandUse,
            @NotBlank String proposalGeoJson,
            Double areaToleranceSqm
    ) {}

    public record RuleValidationResult(
            String code,
            String label,
            String status,
            String detail
    ) {}

    public record PlotValidationResult(
            int plotNumber,
            String featureId,
            double areaSqm,
            boolean insideParent,
            boolean minimumPlotSizePass,
            boolean roadAccessPass,
            List<String> overlaps,
            String status
    ) {}

    public record ValidationSummary(
            String overallStatus,
            int plotCount,
            double parentAreaSqm,
            double proposedAreaSqm,
            double areaDeltaSqm,
            double areaToleranceSqm,
            ZoningRule zoningRule,
            List<RuleValidationResult> ruleResults,
            List<PlotValidationResult> plots
    ) {}
}
