package rw.venus.geosmartmanager.service;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import rw.venus.geosmartmanager.api.dto.UserDtos;
import rw.venus.geosmartmanager.domain.KycStatus;
import rw.venus.geosmartmanager.domain.Role;
import rw.venus.geosmartmanager.domain.UserStatus;
import rw.venus.geosmartmanager.entity.ClientEntity;
import rw.venus.geosmartmanager.entity.UserEntity;
import rw.venus.geosmartmanager.entity.UserSessionEntity;
import rw.venus.geosmartmanager.repo.ClientRepository;
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
    private final ClientRepository clientRepository;

    public UserService(UserRepository userRepository,
                       CurrentUserService currentUserService,
                       PasswordEncoder passwordEncoder,
                       AuditService auditService,
                       UserSessionService userSessionService,
                       ClientRepository clientRepository) {
        this.userRepository = userRepository;
        this.currentUserService = currentUserService;
        this.passwordEncoder = passwordEncoder;
        this.auditService = auditService;
        this.userSessionService = userSessionService;
        this.clientRepository = clientRepository;
    }

    public List<UserEntity> list() {
        return userRepository.findAll();
    }

    public UserEntity create(UserDtos.CreateUserRequest request) {
        if (userRepository.findByEmailIgnoreCase(request.email()).isPresent()) {
            throw new IllegalArgumentException("Email already registered");
        }

        Role role = resolveManagedRoleForCreate(request.role());
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
        ensureClientProfile(user, now);
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
            user.setRole(resolveManagedRoleForUpdate(user, request.role()));
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
        ensureClientProfile(user, Instant.now());
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

    private Role resolveManagedRoleForCreate(Role requestedRole) {
        Role role = requestedRole != null ? requestedRole : Role.SURVEYOR;
        if (role == Role.ADMIN) {
            throw new IllegalArgumentException("Admin accounts cannot be created here.");
        }
        if (role != Role.SURVEYOR && role != Role.CLIENT) {
            return Role.SURVEYOR;
        }
        return role;
    }

    private Role resolveManagedRoleForUpdate(UserEntity user, Role requestedRole) {
        if (user.getRole() == Role.ADMIN) {
            if (requestedRole != Role.ADMIN) {
                throw new IllegalArgumentException("The admin account role cannot be changed.");
            }
            return Role.ADMIN;
        }
        return resolveManagedRoleForCreate(requestedRole);
    }

    public UserEntity updateAvatar(org.springframework.web.multipart.MultipartFile file) {
        UserEntity user = getCurrent();
        if (file.isEmpty()) {
            throw new IllegalArgumentException("File is empty");
        }

        // Validate file size limit: 5MB
        long maxSize = 5 * 1024 * 1024L;
        if (file.getSize() > maxSize) {
            throw new IllegalArgumentException("File is too large. Max size is 5MB.");
        }

        String originalName = file.getOriginalFilename();
        String contentType = file.getContentType();

        // Validate image type: jpg, jpeg, png, webp
        if (contentType == null) {
            contentType = "";
        }
        contentType = contentType.toLowerCase();
        String lowerName = originalName != null ? originalName.toLowerCase() : "";
        
        boolean isValidImage = contentType.equals("image/jpeg") || contentType.equals("image/jpg") || 
                               contentType.equals("image/png") || contentType.equals("image/webp") ||
                               lowerName.endsWith(".jpg") || lowerName.endsWith(".jpeg") || 
                               lowerName.endsWith(".png") || lowerName.endsWith(".webp");

        if (!isValidImage) {
            throw new IllegalArgumentException("Unsupported file type. Only JPG, JPEG, PNG, and WEBP are supported.");
        }

        try {
            java.nio.file.Path uploadPath = java.nio.file.Paths.get("uploads");
            if (!java.nio.file.Files.exists(uploadPath)) {
                java.nio.file.Files.createDirectories(uploadPath);
            }

            // Generate unique name
            String extension = "";
            if (originalName != null && originalName.contains(".")) {
                extension = originalName.substring(originalName.lastIndexOf("."));
            }
            String uniqueName = java.util.UUID.randomUUID().toString() + extension;
            java.nio.file.Path filePath = uploadPath.resolve(uniqueName);

            // Copy file
            java.nio.file.Files.copy(file.getInputStream(), filePath, java.nio.file.StandardCopyOption.REPLACE_EXISTING);

            // Delete old avatar if it exists locally
            if (user.getAvatarUrl() != null && user.getAvatarUrl().startsWith("/uploads/")) {
                try {
                    String oldFileName = user.getAvatarUrl().substring("/uploads/".length());
                    java.nio.file.Path oldPath = uploadPath.resolve(oldFileName);
                    java.nio.file.Files.deleteIfExists(oldPath);
                } catch (Exception e) {
                    // ignore
                }
            }

            user.setAvatarUrl("/uploads/" + uniqueName);
            userRepository.save(user);
            auditService.log(user.getEmail(), "UPDATE_AVATAR", "User", user.getId(), "User profile picture updated");
            return user;
        } catch (java.io.IOException e) {
            throw new RuntimeException("Upload failed. Please try again.");
        }
    }

    public UserEntity deleteAvatar() {
        UserEntity user = getCurrent();
        if (user.getAvatarUrl() != null && user.getAvatarUrl().startsWith("/uploads/")) {
            try {
                java.nio.file.Path uploadPath = java.nio.file.Paths.get("uploads");
                String oldFileName = user.getAvatarUrl().substring("/uploads/".length());
                java.nio.file.Path oldPath = uploadPath.resolve(oldFileName);
                java.nio.file.Files.deleteIfExists(oldPath);
            } catch (Exception e) {
                // ignore
            }
        }
        user.setAvatarUrl(null);
        userRepository.save(user);
        auditService.log(user.getEmail(), "DELETE_AVATAR", "User", user.getId(), "User profile picture removed");
        return user;
    }

    private void ensureClientProfile(UserEntity user, Instant now) {
        if (user == null || user.getRole() != Role.CLIENT) {
            return;
        }
        ClientEntity client = clientRepository.findByUserId(user.getId())
                .orElseGet(() -> ClientEntity.builder()
                        .userId(user.getId())
                        .createdAt(now != null ? now : Instant.now())
                        .kycStatus(KycStatus.PENDING)
                        .build());
        if (client.getName() == null || client.getName().isBlank()) {
            client.setName(user.getFullName());
        }
        if (client.getContactEmail() == null || client.getContactEmail().isBlank()) {
            client.setContactEmail(user.getEmail());
        }
        if (client.getKycStatus() == null) {
            client.setKycStatus(KycStatus.PENDING);
        }
        clientRepository.save(client);
    }
}
