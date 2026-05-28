package rw.venus.geosmartmanager.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.List;

public class PlannerDtos {
    public record LayerStatusResponse(
            String layerKey,
            String sourcePath,
            Integer featureCount,
            String geometryType,
            String crs,
            Integer epsg,
            boolean loadedSuccessfully,
            String notes
    ) {}

    public record ParcelSearchResponse(
            Long id,
            String upi,
            int duplicateUpiCount,
            String province,
            String district,
            String sector,
            String cell,
            String village,
            String status,
            String accuracy,
            Double officialAreaSqm
    ) {}

    public record ParcelDetailResponse(
            Long id,
            String upi,
            int duplicateUpiCount,
            String parcelNumber,
            String province,
            String district,
            String sector,
            String cell,
            String village,
            String status,
            String accuracy,
            Double officialAreaSqm,
            Double calculatedAreaSqm,
            String geometryGeoJson
    ) {}

    public record ZoningRuleResponse(
            String zoneCode,
            String displayName,
            String category,
            String subdivisionStatus,
            Double minimumLotSizeSqm,
            Double maximumLotSizeSqm,
            List<String> allowedUses,
            List<String> prohibitedUses,
            String developmentStrategy,
            String subdivisionGuidance,
            String restrictionSummary,
            String reviewReason,
            List<Integer> sourcePages
    ) {}

    public record ParcelZoneResponse(
            Long zoneId,
            String zoneCode,
            String genLu,
            String zoning,
            String phasing,
            Double overlapAreaSqm,
            Double overlapPercentOfParcel,
            String geometryGeoJson,
            ZoningRuleResponse rule
    ) {}

    public record OverlayLayerResponse(
            String layerKey,
            String label,
            String geoJson
    ) {}

    public record ParcelContextResponse(
            ParcelDetailResponse parcel,
            List<ParcelZoneResponse> zoning,
            List<OverlayLayerResponse> overlays,
            List<String> warnings
    ) {}

    public record SubdivisionCheckRequest(
            @NotNull Long parcelId,
            @NotBlank String proposalGeoJson,
            String proposedLandUse,
            Double areaToleranceSqm
    ) {}

    public record CheckResultResponse(
            String code,
            String label,
            String status,
            String detail
    ) {}

    public record PlotResultResponse(
            int plotNumber,
            String featureId,
            Double areaSqm,
            String status,
            boolean insideParent,
            boolean lotSizePass,
            boolean roadAccessPass,
            boolean buildingSplit,
            boolean slopeRestricted,
            List<String> zoneCodes,
            List<String> restrictedOverlaps,
            List<String> notes
    ) {}

    public record SubdivisionCheckResponse(
            ParcelDetailResponse parcel,
            List<ParcelZoneResponse> zoning,
            int proposedPlotCount,
            Double parentAreaSqm,
            Double proposedAreaSqm,
            Double areaDeltaSqm,
            Double areaToleranceSqm,
            List<CheckResultResponse> checks,
            List<PlotResultResponse> plots,
            List<String> warnings,
            String recommendation,
            Integer complianceScore,
            String disclaimer
    ) {}

    public record PlannerReportResponse(
            Long proposalId,
            Long reportId,
            String createdAt,
            String reportMarkdown,
            SubdivisionCheckResponse report
    ) {}
}
