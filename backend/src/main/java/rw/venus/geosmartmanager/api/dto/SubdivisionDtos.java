package rw.venus.geosmartmanager.api.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import rw.venus.geosmartmanager.domain.SubdivisionOptimizationMode;
import rw.venus.geosmartmanager.domain.SubdivisionStatus;

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
            AiExplanation aiExplanation
    ) {}

    public record AiExplanation(
            double compactnessScore,
            double areaUniformityScore,
            double roadAccessScore,
            double complianceReadinessScore,
            String recommendation,
            String rationale
    ) {}
}
