package rw.venus.geosmartmanager.api.dto;

import rw.venus.geosmartmanager.domain.RunStatus;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import java.time.Instant;
import java.util.UUID;

public final class SubdivisionDtos {
    private SubdivisionDtos() {}

    public record RunRequest(
            @Min(2) @Max(50) int targetParcels,
            @Min(1) double minParcelArea
    ) {}

    public record SuggestRequest(
            @Min(1) double minParcelArea,
            Integer targetParcels
    ) {}

    public record SuggestResponse(
            double boundaryAreaSqm,
            int maxParcels,
            Double estimatedParcelAreaSqm
    ) {}

    public record RunDto(
            UUID id,
            UUID projectId,
            RunStatus status,
            int targetParcels,
            double minParcelArea,
            Instant startedAt,
            Instant finishedAt
    ) {}

    public record RunDetailDto(
            RunDto run,
            String resultGeojson,
            String issuesJson
    ) {}
}
