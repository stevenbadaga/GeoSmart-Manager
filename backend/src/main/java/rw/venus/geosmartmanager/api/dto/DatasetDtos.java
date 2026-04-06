package rw.venus.geosmartmanager.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import rw.venus.geosmartmanager.domain.DatasetExportFormat;
import rw.venus.geosmartmanager.domain.DatasetSourceFormat;
import rw.venus.geosmartmanager.domain.DatasetType;

import java.time.Instant;
import java.util.List;
import java.util.Map;

public class DatasetDtos {
    public record DatasetRequest(
            @NotBlank String name,
            @NotNull DatasetType type,
            @NotBlank String geoJson
    ) {}

    public record DatasetImportRequest(
            @NotBlank String name,
            @NotNull DatasetType type,
            @NotNull DatasetSourceFormat sourceFormat,
            @NotBlank String sourceFileName,
            String rawContent,
            String geoJson
    ) {}

    public record DatasetResponse(
            Long id,
            String name,
            DatasetType type,
            DatasetSourceFormat sourceFormat,
            String sourceFileName,
            String geoJson,
            Long projectId,
            int featureCount,
            String geometryTypeSummary,
            List<String> propertyKeys,
            Instant updatedAt
    ) {}

    public record DatasetAttributeRowResponse(
            int featureIndex,
            String geometryType,
            Map<String, Object> properties
    ) {}

    public record DatasetAttributeTableResponse(
            Long datasetId,
            List<String> columns,
            List<DatasetAttributeRowResponse> rows
    ) {}

    public record DatasetAttributeUpdateRequest(
            Map<String, Object> properties
    ) {}

    public record DatasetExportResponse(
            DatasetExportFormat format,
            String fileName,
            String contentType,
            String content
    ) {}
}
