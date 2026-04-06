package rw.venus.geosmartmanager.api.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import rw.venus.geosmartmanager.domain.Role;
import rw.venus.geosmartmanager.domain.UserStatus;

public class UserDtos {
    public record CreateUserRequest(
            @NotBlank String fullName,
            @Email @NotBlank String email,
            @NotBlank String password,
            @NotNull Role role,
            UserStatus status,
            String professionalLicense,
            String organization,
            String specialization,
            String certifications
    ) {}

    public record UpdateUserRequest(
            String fullName,
            Role role,
            UserStatus status,
            String professionalLicense,
            String organization,
            String specialization,
            String certifications
    ) {}

    public record UpdateProfileRequest(
            String fullName,
            String professionalLicense,
            String organization,
            String specialization,
            String certifications
    ) {}

    public record UserSessionResponse(
            String sessionId,
            String deviceLabel,
            String userAgent,
            String ipAddress,
            java.time.Instant createdAt,
            java.time.Instant lastSeenAt,
            boolean current,
            boolean revoked
    ) {}

    public record SessionActionResponse(
            boolean currentSessionRevoked,
            String message
    ) {}
}
