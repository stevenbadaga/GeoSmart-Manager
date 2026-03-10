package rw.venus.geosmartmanager.api.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import rw.venus.geosmartmanager.domain.Role;
import rw.venus.geosmartmanager.domain.UserStatus;

import java.time.Instant;

public class AuthDtos {
    public record RegisterRequest(
            @NotBlank String fullName,
            @Email @NotBlank String email,
            @NotBlank String password,
            Role role
    ) {}

    public record LoginRequest(
            @Email @NotBlank String email,
            @NotBlank String password
    ) {}

    public record GoogleLoginRequest(
            @NotBlank String idToken
    ) {}

    public record GoogleConfigResponse(
            boolean enabled,
            String clientId
    ) {}

    public record UserResponse(
            Long id,
            String fullName,
            String email,
            Role role,
            UserStatus status,
            String professionalLicense,
            Instant lastActiveAt
    ) {}

    public record AuthResponse(
            String token,
            UserResponse user
    ) {}
}
