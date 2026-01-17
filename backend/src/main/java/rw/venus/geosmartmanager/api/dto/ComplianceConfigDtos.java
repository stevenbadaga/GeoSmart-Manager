package rw.venus.geosmartmanager.api.dto;

import jakarta.validation.constraints.Min;
import java.time.Instant;
import java.util.UUID;

public final class ComplianceConfigDtos {
    private ComplianceConfigDtos() {}

    public record ConfigDto(
            UUID id,
            UUID projectId,
            double minParcelArea,
            Double maxParcelArea,
            Integer expectedParcelCount,
            Instant updatedAt
    ) {}

    public record UpdateConfigRequest(
            @Min(1) double minParcelArea,
            Double maxParcelArea,
            Integer expectedParcelCount
    ) {}
}

