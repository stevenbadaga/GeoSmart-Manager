package rw.venus.geosmartmanager.service;

import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.context.request.RequestAttributes;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;
import rw.venus.geosmartmanager.api.dto.AuthDtos;
import rw.venus.geosmartmanager.config.AppProperties;
import rw.venus.geosmartmanager.domain.UserStatus;
import rw.venus.geosmartmanager.entity.PasswordResetTokenEntity;
import rw.venus.geosmartmanager.entity.UserEntity;
import rw.venus.geosmartmanager.repo.PasswordResetTokenRepository;
import rw.venus.geosmartmanager.repo.UserRepository;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;
import java.util.Locale;

@Service
public class PasswordResetService {
    private static final Logger log = LoggerFactory.getLogger(PasswordResetService.class);
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();
    private static final String GENERIC_FORGOT_PASSWORD_MESSAGE =
            "If the account exists, a password reset link has been sent to the registered email address.";

    private final UserRepository userRepository;
    private final PasswordResetTokenRepository passwordResetTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final PasswordResetMailerService passwordResetMailerService;
    private final AppProperties appProperties;
    private final AuditService auditService;
    private final UserSessionService userSessionService;

    public PasswordResetService(UserRepository userRepository,
                                PasswordResetTokenRepository passwordResetTokenRepository,
                                PasswordEncoder passwordEncoder,
                                PasswordResetMailerService passwordResetMailerService,
                                AppProperties appProperties,
                                AuditService auditService,
                                UserSessionService userSessionService) {
        this.userRepository = userRepository;
        this.passwordResetTokenRepository = passwordResetTokenRepository;
        this.passwordEncoder = passwordEncoder;
        this.passwordResetMailerService = passwordResetMailerService;
        this.appProperties = appProperties;
        this.auditService = auditService;
        this.userSessionService = userSessionService;
    }

    public AuthDtos.MessageResponse requestPasswordReset(AuthDtos.ForgotPasswordRequest request) {
        passwordResetTokenRepository.deleteByExpiresAtBefore(Instant.now());

        userRepository.findByEmailIgnoreCase(request.email())
                .filter(UserEntity::isEnabled)
                .ifPresent(user -> issueResetToken(user, request.email()));

        return new AuthDtos.MessageResponse(GENERIC_FORGOT_PASSWORD_MESSAGE);
    }

    public AuthDtos.ResetTokenValidationResponse validateResetToken(String token) {
        PasswordResetTokenEntity entity = loadActiveToken(token);
        return new AuthDtos.ResetTokenValidationResponse(true,
                "Token valid for " + entity.getUser().getEmail().toLowerCase(Locale.ROOT));
    }

    public AuthDtos.MessageResponse resetPassword(AuthDtos.ResetPasswordRequest request) {
        if (!request.newPassword().equals(request.confirmPassword())) {
            throw new IllegalArgumentException("New password and confirmation password do not match.");
        }
        if (request.newPassword().trim().length() < 8) {
            throw new IllegalArgumentException("New password must be at least 8 characters long.");
        }

        PasswordResetTokenEntity entity = loadActiveToken(request.token());
        UserEntity user = entity.getUser();
        user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
        user.setStatus(UserStatus.ACTIVE);
        user.setLastActiveAt(Instant.now());
        userRepository.save(user);

        entity.setUsedAt(Instant.now());
        passwordResetTokenRepository.save(entity);
        invalidateOtherUnusedTokens(user.getId(), entity.getId());
        userSessionService.revokeAllSessions(user.getId());
        auditService.log(user.getEmail(), "RESET_PASSWORD", "User", user.getId(), "Password reset completed");
        return new AuthDtos.MessageResponse("Password updated successfully. You can now sign in with the new password.");
    }

    private void issueResetToken(UserEntity user, String requestedEmail) {
        String rawToken = generateToken();
        Instant expiresAt = Instant.now().plusSeconds(Math.max(5, appProperties.getAuth().getPasswordResetTokenExpirationMinutes()) * 60L);
        PasswordResetTokenEntity entity = PasswordResetTokenEntity.builder()
                .user(user)
                .tokenHash(hashToken(rawToken))
                .expiresAt(expiresAt)
                .createdAt(Instant.now())
                .requestedIp(resolveRequestedIp())
                .build();
        passwordResetTokenRepository.save(entity);

        String resetLink = buildResetLink(rawToken);
        try {
            passwordResetMailerService.sendResetEmail(user, resetLink, expiresAt);
        } catch (RuntimeException ex) {
            log.warn("Password reset email is disabled or failed: {}", ex.getMessage());
            return;
        }
        invalidateOtherUnusedTokens(user.getId(), entity.getId());
        auditService.log(user.getEmail(), "REQUEST_PASSWORD_RESET", "User", user.getId(),
                "Password reset email issued for " + requestedEmail.toLowerCase(Locale.ROOT));
    }

    private PasswordResetTokenEntity loadActiveToken(String rawToken) {
        if (rawToken == null || rawToken.isBlank()) {
            throw new IllegalArgumentException("Reset token is required.");
        }
        PasswordResetTokenEntity entity = passwordResetTokenRepository.findByTokenHash(hashToken(rawToken))
                .orElseThrow(() -> new IllegalArgumentException("This password reset link is invalid."));
        if (entity.getUsedAt() != null) {
            throw new IllegalArgumentException("This password reset link has already been used.");
        }
        if (entity.getExpiresAt() == null || entity.getExpiresAt().isBefore(Instant.now())) {
            throw new IllegalArgumentException("This password reset link has expired.");
        }
        return entity;
    }

    private void invalidateOtherUnusedTokens(Long userId, Long keepTokenId) {
        for (PasswordResetTokenEntity token : passwordResetTokenRepository.findByUserIdAndUsedAtIsNull(userId)) {
            if (keepTokenId != null && keepTokenId.equals(token.getId())) {
                continue;
            }
            token.setUsedAt(Instant.now());
            passwordResetTokenRepository.save(token);
        }
    }

    private String buildResetLink(String rawToken) {
        String base = normalize(appProperties.getAuth().getPasswordResetUrlBase());
        if (base == null) {
            throw new IllegalStateException("Password reset URL is not configured. Set APP_AUTH_PASSWORD_RESET_URL_BASE.");
        }
        String separator = base.contains("?") ? "&" : "?";
        return base + separator + "token=" + rawToken;
    }

    private String generateToken() {
        byte[] bytes = new byte[32];
        SECURE_RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private String hashToken(String rawToken) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(rawToken.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (Exception ex) {
            throw new IllegalStateException("Unable to generate password reset token hash.");
        }
    }

    private String resolveRequestedIp() {
        HttpServletRequest request = getCurrentRequest();
        if (request == null) {
            return null;
        }
        String forwarded = normalize(request.getHeader("X-Forwarded-For"));
        if (forwarded != null) {
            int commaIndex = forwarded.indexOf(',');
            return commaIndex >= 0 ? forwarded.substring(0, commaIndex).trim() : forwarded;
        }
        return normalize(request.getRemoteAddr());
    }

    private HttpServletRequest getCurrentRequest() {
        RequestAttributes attributes = RequestContextHolder.getRequestAttributes();
        if (attributes instanceof ServletRequestAttributes servletRequestAttributes) {
            return servletRequestAttributes.getRequest();
        }
        return null;
    }

    private String normalize(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
