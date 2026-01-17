package rw.venus.geosmartmanager.api.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import java.time.Instant;
import java.util.UUID;

public final class ClientDtos {
    private ClientDtos() {}

    public record ClientDto(
            UUID id,
            String name,
            String email,
            String phone,
            String address,
            Instant createdAt
    ) {}

    public record CreateClientRequest(
            @NotBlank String name,
            @Email String email,
            String phone,
            String address
    ) {}

    public record UpdateClientRequest(
            @NotBlank String name,
            @Email String email,
            String phone,
            String address
    ) {}
}

