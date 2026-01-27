package rw.venus.geosmartmanager.api.dto;

import rw.venus.geosmartmanager.domain.UserRole;
import java.time.Instant;
import java.util.UUID;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public final class AuthDtos {
    private AuthDtos() {}

    public record LoginRequest(
            @NotBlank String username,
            @NotBlank String password,
            String mfaCode
    ) {}

    public record UserDto(
            UUID id,
            String username,
            String email,
            UserRole role,
            String fullName,
            String phone,
            String licenseNumber,
            String certification,
            String specialization,
            boolean mfaEnabled,
            boolean enabled,
            Instant createdAt
    ) {}

    public record RegisterRequest(
            @NotBlank String username,
            @NotBlank String email,
            @NotBlank String password,
            @NotNull UserRole role,
            String fullName,
            String phone,
            String licenseNumber,
            String certification,
            String specialization,
            String clientName,
            String clientAddress
    ) {}

    public record LoginResponse(
            String token,
            UUID sessionId,
            UserDto user
    ) {}

    public record SessionDto(
            UUID id,
            Instant createdAt,
            Instant lastSeenAt,
            String userAgent,
            String ipAddress,
            Instant revokedAt
    ) {}

    public record MfaSetupResponse(
            String secret,
            String otpauthUrl
    ) {}

    public record MfaVerifyRequest(
            @NotBlank String code
    ) {}

    public record UpdateProfileRequest(
            String fullName,
            String phone,
            String licenseNumber,
            String certification,
            String specialization
    ) {}

    public record BootstrapStatusResponse(
            boolean ready,
            String adminUsername
    ) {}
}
