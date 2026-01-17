package rw.venus.geosmartmanager.api.dto;

import rw.venus.geosmartmanager.domain.ReportType;
import jakarta.validation.constraints.NotNull;
import java.time.Instant;
import java.util.UUID;

public final class ReportDtos {
    private ReportDtos() {}

    public record GenerateReportRequest(
            @NotNull ReportType type,
            UUID subdivisionRunId
    ) {}

    public record ReportDto(
            UUID id,
            UUID projectId,
            ReportType type,
            Instant createdAt
    ) {}
}

