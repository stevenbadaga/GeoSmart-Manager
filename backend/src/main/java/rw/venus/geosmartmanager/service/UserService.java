package rw.venus.geosmartmanager.service;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import rw.venus.geosmartmanager.api.dto.UserDtos;
import rw.venus.geosmartmanager.domain.Role;
import rw.venus.geosmartmanager.domain.UserStatus;
import rw.venus.geosmartmanager.entity.UserEntity;
import rw.venus.geosmartmanager.repo.UserRepository;

import java.time.Instant;
import java.util.List;

@Service
public class UserService {
    private final UserRepository userRepository;
    private final CurrentUserService currentUserService;
    private final PasswordEncoder passwordEncoder;
    private final AuditService auditService;

    public UserService(UserRepository userRepository,
                       CurrentUserService currentUserService,
                       PasswordEncoder passwordEncoder,
                       AuditService auditService) {
        this.userRepository = userRepository;
        this.currentUserService = currentUserService;
        this.passwordEncoder = passwordEncoder;
        this.auditService = auditService;
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
                .professionalLicense(request.professionalLicense())
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
            user.setProfessionalLicense(request.professionalLicense().isBlank() ? null : request.professionalLicense());
        }

        userRepository.save(user);
        auditService.log(currentUserService.getCurrentUserEmail(), "UPDATE", "User", user.getId(), "User updated");
        return user;
    }

    public UserEntity getCurrent() {
        UserEntity user = currentUserService.getCurrentUser();
        if (user == null) {
            throw new IllegalArgumentException("No authenticated user");
        }
        return user;
    }

    public UserEntity markOffline() {
        UserEntity user = getCurrent();
        user.setStatus(UserStatus.OFFLINE);
        user.setLastActiveAt(Instant.now());
        userRepository.save(user);
        return user;
    }
}
