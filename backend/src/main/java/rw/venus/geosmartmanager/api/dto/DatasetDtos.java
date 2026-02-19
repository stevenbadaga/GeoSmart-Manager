package rw.venus.geosmartmanager.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import rw.venus.geosmartmanager.domain.DatasetType;

public class DatasetDtos {
    public record DatasetRequest(
            @NotBlank String name,
            @NotNull DatasetType type,
            @NotBlank String geoJson
    ) {}

    public record DatasetResponse(
            Long id,
            String name,
            DatasetType type,
            String geoJson,
            Long projectId
    ) {}
}
