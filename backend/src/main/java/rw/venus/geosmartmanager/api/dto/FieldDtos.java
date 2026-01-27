package rw.venus.geosmartmanager.api.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public final class FieldDtos {
    private FieldDtos() {}

    public record CreateObservationRequest(
            @Size(max = 255) String title,
            @DecimalMin(value = "-90.0") @DecimalMax(value = "90.0") double latitude,
            @DecimalMin(value = "-180.0") @DecimalMax(value = "180.0") double longitude,
            Double altitudeM,
            Double accuracyM,
            Instant observedAt,
            String notes
    ) {}

    public record ObservationDto(
            UUID id,
            UUID projectId,
            String title,
            double latitude,
            double longitude,
            Double altitudeM,
            Double accuracyM,
            Instant observedAt,
            String notes,
            boolean hasPhoto,
            String createdByUsername,
            Instant createdAt
    ) {}

    public record CreateEquipmentLogRequest(
            @NotBlank @Size(max = 255) String equipmentName,
            @Size(max = 128) String serialNumber,
            LocalDate calibrationDate,
            @NotBlank @Size(max = 32) String status,
            @Size(max = 2000) String notes
    ) {}

    public record EquipmentLogDto(
            UUID id,
            UUID projectId,
            String equipmentName,
            String serialNumber,
            LocalDate calibrationDate,
            String status,
            String notes,
            String createdByUsername,
            Instant createdAt
    ) {}
}

