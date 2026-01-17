package rw.venus.geosmartmanager.api.dto;

import rw.venus.geosmartmanager.domain.UserRole;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.Instant;
import java.util.UUID;

public final class UserDtos {
    private UserDtos() {}

    public record UserDto(
            UUID id,
            String username,
            String email,
            UserRole role,
            boolean enabled,
            Instant createdAt
    ) {}

    public record CreateUserRequest(
            @NotBlank String username,
            @Email @NotBlank String email,
            @NotBlank String password,
            @NotNull UserRole role
    ) {}

    public record UpdateUserStatusRequest(
            boolean enabled
    ) {}
}

