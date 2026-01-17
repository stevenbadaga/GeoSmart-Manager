package rw.venus.geosmartmanager.service;

import rw.venus.geosmartmanager.api.dto.UserDtos;
import rw.venus.geosmartmanager.entity.UserEntity;
import rw.venus.geosmartmanager.exception.ApiException;
import rw.venus.geosmartmanager.repo.UserRepository;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class UserService {
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuditService auditService;

    public UserService(UserRepository userRepository, PasswordEncoder passwordEncoder, AuditService auditService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.auditService = auditService;
    }

    public List<UserDtos.UserDto> list() {
        return userRepository.findAll().stream().map(this::toDto).toList();
    }

    public UserDtos.UserDto create(UserEntity actor, UserDtos.CreateUserRequest req) {
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
        user.setEnabled(true);
        UserEntity saved = userRepository.save(user);

        auditService.log(actor, "USER_CREATED", "User", saved.getId());
        return toDto(saved);
    }

    public UserDtos.UserDto updateStatus(UserEntity actor, UUID userId, UserDtos.UpdateUserStatusRequest req) {
        UserEntity user = userRepository.findById(userId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "User not found"));
        user.setEnabled(req.enabled());
        UserEntity saved = userRepository.save(user);
        auditService.log(actor, "USER_STATUS_UPDATED", "User", saved.getId());
        return toDto(saved);
    }

    public UserDtos.UserDto toDto(UserEntity user) {
        return new UserDtos.UserDto(
                user.getId(),
                user.getUsername(),
                user.getEmail(),
                user.getRole(),
                user.isEnabled(),
                user.getCreatedAt()
        );
    }
}

