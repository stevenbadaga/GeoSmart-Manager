package rw.venus.geosmartmanager.api.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
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

    public record ForgotPasswordRequest(
            @Email @NotBlank String email
    ) {}

    public record ResetPasswordRequest(
            @NotBlank String token,
            @NotBlank @Size(min = 8, max = 120) String newPassword,
            @NotBlank @Size(min = 8, max = 120) String confirmPassword
    ) {}

    public record GoogleLoginRequest(
            @NotBlank String idToken
    ) {}

    public record GoogleConfigResponse(
            boolean enabled,
            String clientId
    ) {}

    public record MessageResponse(
            String message,
            String resetLink
    ) {
        public MessageResponse(String message) {
            this(message, null);
        }
    }

    public record ResetTokenValidationResponse(
            boolean valid,
            String message
    ) {}

    public record UserResponse(
            Long id,
            String fullName,
            String email,
            Role role,
            UserStatus status,
            String professionalLicense,
            String organization,
            String specialization,
            String certifications,
            Instant lastActiveAt
    ) {}

    public record AuthResponse(
            String token,
            UserResponse user
    ) {}
}
