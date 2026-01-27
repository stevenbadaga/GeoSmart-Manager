package rw.venus.geosmartmanager.api.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import java.time.Instant;
import java.util.UUID;

public final class ClientDtos {
    private ClientDtos() {}

    public record ClientDto(
            UUID id,
            UUID userId,
            String name,
            String email,
            String phone,
            String address,
            String kycIdType,
            String kycIdNumber,
            String kycNotes,
            String landOwnershipDetails,
            Instant createdAt
    ) {}

    public record CreateClientRequest(
            @NotBlank String name,
            @Email String email,
            String phone,
            String address,
            UUID userId,
            String kycIdType,
            String kycIdNumber,
            String kycNotes,
            String landOwnershipDetails
    ) {}

    public record UpdateClientRequest(
            @NotBlank String name,
            @Email String email,
            String phone,
            String address,
            UUID userId,
            String kycIdType,
            String kycIdNumber,
            String kycNotes,
            String landOwnershipDetails
    ) {}
}
