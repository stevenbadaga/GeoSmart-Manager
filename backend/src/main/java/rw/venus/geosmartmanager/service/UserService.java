package rw.venus.geosmartmanager.service;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import rw.venus.geosmartmanager.api.dto.UserDtos;
import rw.venus.geosmartmanager.domain.Role;
import rw.venus.geosmartmanager.domain.UserStatus;
import rw.venus.geosmartmanager.entity.UserEntity;
import rw.venus.geosmartmanager.entity.UserSessionEntity;
import rw.venus.geosmartmanager.repo.UserRepository;

import java.time.Instant;
import java.util.List;

@Service
public class UserService {
    private final UserRepository userRepository;
    private final CurrentUserService currentUserService;
    private final PasswordEncoder passwordEncoder;
    private final AuditService auditService;
    private final UserSessionService userSessionService;

    public UserService(UserRepository userRepository,
                       CurrentUserService currentUserService,
                       PasswordEncoder passwordEncoder,
                       AuditService auditService,
                       UserSessionService userSessionService) {
        this.userRepository = userRepository;
        this.currentUserService = currentUserService;
        this.passwordEncoder = passwordEncoder;
        this.auditService = auditService;
        this.userSessionService = userSessionService;
    }

    public List<UserEntity> list() {
        return userRepository.findAll();
    }

    public UserEntity create(UserDtos.CreateUserRequest request) {
        if (userRepository.findByEmailIgnoreCase(request.email()).isPresent()) {
            throw new IllegalArgumentException("Email already registered");
        }

        Role role = request.role() != null ? request.role() : Role.ENGINEER;
        UserStatus status = request.status() != null ? request.status() : UserStatus.ACTIVE;
        Instant now = Instant.now();

        UserEntity user = UserEntity.builder()
                .fullName(request.fullName())
                .email(request.email().toLowerCase())
                .passwordHash(passwordEncoder.encode(request.password()))
                .role(role)
                .status(status)
                .professionalLicense(normalizeOptional(request.professionalLicense()))
                .organization(normalizeOptional(request.organization()))
                .specialization(normalizeOptional(request.specialization()))
                .certifications(normalizeOptional(request.certifications()))
                .createdAt(now)
                .lastActiveAt(status == UserStatus.ACTIVE ? now : null)
                .build();
        userRepository.save(user);
        auditService.log(currentUserService.getCurrentUserEmail(), "CREATE", "User", user.getId(), "User created");
        return user;
    }

    public UserEntity update(Long userId, UserDtos.UpdateUserRequest request) {
        UserEntity user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        if (request.fullName() != null && !request.fullName().isBlank()) {
            user.setFullName(request.fullName());
        }
        if (request.role() != null) {
            user.setRole(request.role());
        }
        if (request.status() != null) {
            user.setStatus(request.status());
        }
        if (request.professionalLicense() != null) {
            user.setProfessionalLicense(normalizeOptional(request.professionalLicense()));
        }
        if (request.organization() != null) {
            user.setOrganization(normalizeOptional(request.organization()));
        }
        if (request.specialization() != null) {
            user.setSpecialization(normalizeOptional(request.specialization()));
        }
        if (request.certifications() != null) {
            user.setCertifications(normalizeOptional(request.certifications()));
        }

        userRepository.save(user);
        auditService.log(currentUserService.getCurrentUserEmail(), "UPDATE", "User", user.getId(), "User updated");
        return user;
    }

    public UserEntity updateCurrentProfile(UserDtos.UpdateProfileRequest request) {
        UserEntity user = getCurrent();
        if (request.fullName() != null && !request.fullName().isBlank()) {
            user.setFullName(request.fullName().trim());
        }
        if (request.professionalLicense() != null) {
            user.setProfessionalLicense(normalizeOptional(request.professionalLicense()));
        }
        if (request.organization() != null) {
            user.setOrganization(normalizeOptional(request.organization()));
        }
        if (request.specialization() != null) {
            user.setSpecialization(normalizeOptional(request.specialization()));
        }
        if (request.certifications() != null) {
            user.setCertifications(normalizeOptional(request.certifications()));
        }
        userRepository.save(user);
        auditService.log(user.getEmail(), "UPDATE_PROFILE", "User", user.getId(), "User profile updated");
        return user;
    }

    public UserEntity getCurrent() {
        UserEntity user = currentUserService.getCurrentUser();
        if (user == null) {
            throw new IllegalArgumentException("No authenticated user");
        }
        return user;
    }

    public UserEntity markOnline() {
        UserEntity user = getCurrent();
        boolean statusChanged = user.getStatus() != UserStatus.ACTIVE;
        user.setStatus(UserStatus.ACTIVE);
        user.setLastActiveAt(Instant.now());
        userRepository.save(user);
        userSessionService.touchSession(currentUserService.getCurrentSessionId());
        if (statusChanged) {
            auditService.log(user.getEmail(), "ONLINE", "User", user.getId(), "User marked online");
        }
        return user;
    }

    public UserEntity markOffline() {
        UserEntity user = getCurrent();
        boolean statusChanged = user.getStatus() != UserStatus.OFFLINE;
        user.setStatus(UserStatus.OFFLINE);
        user.setLastActiveAt(Instant.now());
        userRepository.save(user);
        if (statusChanged) {
            auditService.log(user.getEmail(), "OFFLINE", "User", user.getId(), "User marked offline");
        }
        return user;
    }

    public List<UserDtos.UserSessionResponse> listCurrentSessions() {
        UserEntity user = getCurrent();
        String currentSessionId = currentUserService.getCurrentSessionId();
        return userSessionService.listByUserId(user.getId()).stream()
                .map(session -> toSessionResponse(session, currentSessionId))
                .toList();
    }

    public UserDtos.SessionActionResponse revokeSession(String sessionId) {
        UserEntity user = getCurrent();
        boolean changed = userSessionService.revokeSession(user.getId(), sessionId);
        boolean currentSessionRevoked = sessionId != null && sessionId.equals(currentUserService.getCurrentSessionId());
        if (changed) {
            if (currentSessionRevoked) {
                user.setStatus(UserStatus.OFFLINE);
                user.setLastActiveAt(Instant.now());
                userRepository.save(user);
            }
            auditService.log(user.getEmail(), "REVOKE_SESSION", "UserSession", user.getId(), "Revoked session " + sessionId);
        }
        return new UserDtos.SessionActionResponse(
                currentSessionRevoked,
                changed ? "Session revoked." : "Session was already inactive."
        );
    }

    public UserDtos.SessionActionResponse revokeOtherSessions() {
        UserEntity user = getCurrent();
        String currentSessionId = currentUserService.getCurrentSessionId();
        int revoked = userSessionService.revokeOtherSessions(user.getId(), currentSessionId);
        if (revoked > 0) {
            auditService.log(user.getEmail(), "REVOKE_OTHER_SESSIONS", "UserSession", user.getId(), "Revoked " + revoked + " other session(s)");
        }
        return new UserDtos.SessionActionResponse(false, revoked + " session(s) revoked.");
    }

    public UserDtos.SessionActionResponse logoutCurrentSession() {
        UserEntity user = getCurrent();
        String currentSessionId = currentUserService.getCurrentSessionId();
        boolean revoked = currentSessionId != null && userSessionService.revokeSession(user.getId(), currentSessionId);
        user.setStatus(UserStatus.OFFLINE);
        user.setLastActiveAt(Instant.now());
        userRepository.save(user);
        auditService.log(user.getEmail(), "LOGOUT", "User", user.getId(), "User logged out");
        return new UserDtos.SessionActionResponse(true, revoked ? "Current session ended." : "Logged out.");
    }

    private UserDtos.UserSessionResponse toSessionResponse(UserSessionEntity session, String currentSessionId) {
        return new UserDtos.UserSessionResponse(
                session.getSessionId(),
                session.getDeviceLabel(),
                session.getUserAgent(),
                session.getIpAddress(),
                session.getCreatedAt(),
                session.getLastSeenAt(),
                session.getSessionId().equals(currentSessionId),
                session.getRevokedAt() != null
        );
    }

    private String normalizeOptional(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
