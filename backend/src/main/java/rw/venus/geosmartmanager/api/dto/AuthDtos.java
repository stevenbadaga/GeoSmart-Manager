package rw.venus.geosmartmanager.api.dto;

import rw.venus.geosmartmanager.domain.UserRole;
import java.time.Instant;
import java.util.UUID;
import jakarta.validation.constraints.NotBlank;

public final class AuthDtos {
    private AuthDtos() {}

    public record LoginRequest(
            @NotBlank String username,
            @NotBlank String password
    ) {}

    public record UserDto(
            UUID id,
            String username,
            String email,
            UserRole role,
            boolean enabled,
            Instant createdAt
    ) {}

    public record LoginResponse(
            String token,
            UserDto user
    ) {}

    public record BootstrapStatusResponse(
            boolean ready,
            String adminUsername
    ) {}
}

