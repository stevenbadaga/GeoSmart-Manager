package rw.venus.geosmartmanager.api.dto;

import jakarta.validation.constraints.NotNull;
import rw.venus.geosmartmanager.domain.ReportType;

public class ReportDtos {
    public record GenerateReportRequest(
            @NotNull ReportType type
    ) {}

    public record ReportResponse(
            Long id,
            Long projectId,
            ReportType type,
            String content
    ) {}
}
