package rw.venus.geosmartmanager.api.dto;

import jakarta.validation.constraints.NotNull;
import rw.venus.geosmartmanager.domain.ComplianceStatus;

public class ComplianceDtos {
    public record RunComplianceRequest(
            @NotNull Long subdivisionRunId
    ) {}

    public record ComplianceResponse(
            Long id,
            Long projectId,
            Long subdivisionRunId,
            ComplianceStatus status,
            String findings
    ) {}
}
