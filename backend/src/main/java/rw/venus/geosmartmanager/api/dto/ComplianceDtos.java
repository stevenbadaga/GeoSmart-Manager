package rw.venus.geosmartmanager.api.dto;

import rw.venus.geosmartmanager.domain.ComplianceStatus;
import jakarta.validation.constraints.NotNull;
import java.time.Instant;
import java.util.UUID;

public final class ComplianceDtos {
    private ComplianceDtos() {}

    public record CheckRequest(
            @NotNull UUID subdivisionRunId
    ) {}

    public record ComplianceDto(
            UUID id,
            UUID projectId,
            UUID subdivisionRunId,
            ComplianceStatus status,
            String issuesJson,
            Instant checkedAt
    ) {}
}

