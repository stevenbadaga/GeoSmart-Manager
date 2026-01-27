package rw.venus.geosmartmanager.service;

import rw.venus.geosmartmanager.api.dto.AuthDtos;
import rw.venus.geosmartmanager.config.AppProperties;
import rw.venus.geosmartmanager.domain.UserRole;
import rw.venus.geosmartmanager.entity.ClientEntity;
import rw.venus.geosmartmanager.entity.UserEntity;
import rw.venus.geosmartmanager.entity.UserSessionEntity;
import rw.venus.geosmartmanager.exception.ApiException;
import rw.venus.geosmartmanager.repo.ClientRepository;
import rw.venus.geosmartmanager.repo.UserRepository;
import rw.venus.geosmartmanager.security.JwtService;
import rw.venus.geosmartmanager.security.TotpService;
import rw.venus.geosmartmanager.repo.UserSessionRepository;
import jakarta.servlet.http.HttpServletRequest;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class AuthService {
    private final UserRepository userRepository;
    private final UserSessionRepository userSessionRepository;
    private final ClientRepository clientRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final TotpService totpService;
    private final AuditService auditService;
    private final AppProperties appProperties;

    public AuthService(
            UserRepository userRepository,
            UserSessionRepository userSessionRepository,
            ClientRepository clientRepository,
            PasswordEncoder passwordEncoder,
            JwtService jwtService,
            TotpService totpService,
            AuditService auditService,
            AppProperties appProperties
    ) {
        this.userRepository = userRepository;
        this.userSessionRepository = userSessionRepository;
        this.clientRepository = clientRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.totpService = totpService;
        this.auditService = auditService;
        this.appProperties = appProperties;
    }

    public AuthDtos.LoginResponse login(AuthDtos.LoginRequest req, HttpServletRequest request) {
        Optional<UserEntity> opt = userRepository.findByUsername(req.username());
        if (opt.isEmpty()) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "INVALID_CREDENTIALS", "Invalid username or password");
        }

        UserEntity user = opt.get();
        if (!user.isEnabled()) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "USER_DISABLED", "Account is disabled");
        }

        if (!passwordEncoder.matches(req.password(), user.getPasswordHash())) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "INVALID_CREDENTIALS", "Invalid username or password");
        }

        if (user.isMfaEnabled()) {
            if (req.mfaCode() == null || req.mfaCode().isBlank()) {
                throw new ApiException(HttpStatus.UNAUTHORIZED, "MFA_REQUIRED", "Multi-factor authentication code required");
            }
            if (!totpService.verifyCode(user.getMfaSecret(), req.mfaCode())) {
                throw new ApiException(HttpStatus.UNAUTHORIZED, "INVALID_MFA", "Invalid multi-factor authentication code");
            }
        }

        Instant now = Instant.now();
        user.setLastLoginAt(now);
        userRepository.save(user);

        UserSessionEntity session = new UserSessionEntity();
        session.setUser(user);
        session.setLastSeenAt(now);
        session.setUserAgent(safeUserAgent(request));
        session.setIpAddress(safeIp(request));
        UserSessionEntity savedSession = userSessionRepository.save(session);

        String token = jwtService.createToken(user.getUsername(), user.getRole(), savedSession.getId());
        auditService.log(user, "USER_LOGIN", "UserSession", savedSession.getId());
        return new AuthDtos.LoginResponse(token, savedSession.getId(), toDto(user));
    }

    public AuthDtos.LoginResponse register(AuthDtos.RegisterRequest req, HttpServletRequest request) {
        if (req.role() == UserRole.ADMIN) {
            throw new ApiException(HttpStatus.FORBIDDEN, "ADMIN_REGISTER_FORBIDDEN", "Admin registration is not allowed");
        }

        if (userRepository.existsByUsername(req.username())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "USERNAME_TAKEN", "Username is already taken");
        }
        if (userRepository.existsByEmail(req.email())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "EMAIL_TAKEN", "Email is already taken");
        }

        UserEntity user = new UserEntity();
        user.setUsername(req.username());
        user.setEmail(req.email());
        user.setPasswordHash(passwordEncoder.encode(req.password()));
        user.setRole(req.role());
        user.setFullName(req.fullName());
        user.setPhone(req.phone());
        user.setLicenseNumber(req.licenseNumber());
        user.setCertification(req.certification());
        user.setSpecialization(req.specialization());
        user.setEnabled(true);
        UserEntity savedUser = userRepository.save(user);

        if (savedUser.getRole() == UserRole.CLIENT) {
            String clientName = (req.clientName() == null || req.clientName().isBlank()) ? savedUser.getUsername() : req.clientName();
            ClientEntity client = new ClientEntity();
            client.setName(clientName);
            client.setEmail(savedUser.getEmail());
            client.setPhone(savedUser.getPhone());
            client.setAddress(req.clientAddress());
            client.setUser(savedUser);
            clientRepository.save(client);
        }

        auditService.log(savedUser, "USER_REGISTERED", "User", savedUser.getId());
        return login(new AuthDtos.LoginRequest(req.username(), req.password(), null), request);
    }

    public java.util.List<AuthDtos.SessionDto> listSessions(UserEntity actor) {
        return userSessionRepository.findByUserIdOrderByLastSeenAtDesc(actor.getId()).stream()
                .map(s -> new AuthDtos.SessionDto(
                        s.getId(),
                        s.getCreatedAt(),
                        s.getLastSeenAt(),
                        s.getUserAgent(),
                        s.getIpAddress(),
                        s.getRevokedAt()
                ))
                .toList();
    }

    public void revokeSession(UserEntity actor, UUID sessionId) {
        UserSessionEntity session = userSessionRepository.findByIdAndUserId(sessionId, actor.getId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Session not found"));
        session.setRevokedAt(Instant.now());
        userSessionRepository.save(session);
        auditService.log(actor, "SESSION_REVOKED", "UserSession", sessionId);
    }

    public AuthDtos.MfaSetupResponse beginMfaSetup(UserEntity actor) {
        if (actor.isMfaEnabled()) {
            throw new ApiException(HttpStatus.CONFLICT, "MFA_ALREADY_ENABLED", "Multi-factor authentication is already enabled");
        }
        String secret = totpService.generateBase32Secret();
        actor.setMfaSecret(secret);
        userRepository.save(actor);
        String issuer = appProperties.getJwt().getIssuer() == null ? "GeoSmart-Manager" : appProperties.getJwt().getIssuer();
        String url = totpService.buildOtpAuthUrl(issuer, actor.getUsername(), secret);
        auditService.log(actor, "MFA_SETUP_STARTED", "User", actor.getId());
        return new AuthDtos.MfaSetupResponse(secret, url);
    }

    public AuthDtos.UserDto enableMfa(UserEntity actor, AuthDtos.MfaVerifyRequest req) {
        if (actor.isMfaEnabled()) {
            return toDto(actor);
        }
        if (actor.getMfaSecret() == null || actor.getMfaSecret().isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "MFA_NOT_SETUP", "Start MFA setup first");
        }
        if (!totpService.verifyCode(actor.getMfaSecret(), req.code())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_MFA", "Invalid code");
        }
        actor.setMfaEnabled(true);
        userRepository.save(actor);
        auditService.log(actor, "MFA_ENABLED", "User", actor.getId());
        return toDto(actor);
    }

    public AuthDtos.UserDto disableMfa(UserEntity actor, AuthDtos.MfaVerifyRequest req) {
        if (!actor.isMfaEnabled()) {
            return toDto(actor);
        }
        if (!totpService.verifyCode(actor.getMfaSecret(), req.code())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_MFA", "Invalid code");
        }
        actor.setMfaEnabled(false);
        actor.setMfaSecret(null);
        userRepository.save(actor);
        auditService.log(actor, "MFA_DISABLED", "User", actor.getId());
        return toDto(actor);
    }

    public AuthDtos.UserDto updateProfile(UserEntity actor, AuthDtos.UpdateProfileRequest req) {
        actor.setFullName(req.fullName());
        actor.setPhone(req.phone());
        actor.setLicenseNumber(req.licenseNumber());
        actor.setCertification(req.certification());
        actor.setSpecialization(req.specialization());
        UserEntity saved = userRepository.save(actor);
        auditService.log(actor, "USER_PROFILE_UPDATED", "User", actor.getId());
        return toDto(saved);
    }

    public java.util.List<rw.venus.geosmartmanager.api.dto.AuditDtos.AuditLogDto> listMyActivity(UserEntity actor, int page, int size) {
        return auditService.listForActor(actor.getId(), page, size);
    }

    public AuthDtos.UserDto toDto(UserEntity user) {
        return new AuthDtos.UserDto(
                user.getId(),
                user.getUsername(),
                user.getEmail(),
                user.getRole(),
                user.getFullName(),
                user.getPhone(),
                user.getLicenseNumber(),
                user.getCertification(),
                user.getSpecialization(),
                user.isMfaEnabled(),
                user.isEnabled(),
                user.getCreatedAt()
        );
    }

    private String safeUserAgent(HttpServletRequest req) {
        try {
            String ua = req.getHeader("User-Agent");
            if (ua == null) {
                return null;
            }
            String v = ua.trim();
            return v.length() > 512 ? v.substring(0, 512) : v;
        } catch (Exception ignored) {
            return null;
        }
    }

    private String safeIp(HttpServletRequest req) {
        try {
            String ip = req.getRemoteAddr();
            if (ip == null) {
                return null;
            }
            String v = ip.trim();
            return v.length() > 64 ? v.substring(0, 64) : v;
        } catch (Exception ignored) {
            return null;
        }
    }
}
