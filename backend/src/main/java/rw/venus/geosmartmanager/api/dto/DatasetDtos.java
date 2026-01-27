package rw.venus.geosmartmanager.api.dto;

import com.fasterxml.jackson.databind.JsonNode;
import rw.venus.geosmartmanager.domain.DatasetType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.Instant;
import java.util.UUID;

public final class DatasetDtos {
    private DatasetDtos() {}

    public record DatasetDto(
            UUID id,
            UUID projectId,
            String name,
            DatasetType type,
            int version,
            String format,
            boolean hasGeojsonPreview,
            String originalFilename,
            String contentType,
            long sizeBytes,
            String checksumSha256,
            Instant uploadedAt
    ) {}

    public record CreateDatasetMetadata(
            @NotBlank String name,
            @NotNull DatasetType type
    ) {}

    public record SaveGeoJsonVersionRequest(
            String name,
            @NotNull JsonNode geojson
    ) {}
}
