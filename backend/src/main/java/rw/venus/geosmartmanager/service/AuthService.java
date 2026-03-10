package rw.venus.geosmartmanager.service;

import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import rw.venus.geosmartmanager.api.dto.AuthDtos;
import rw.venus.geosmartmanager.config.JwtService;
import rw.venus.geosmartmanager.domain.Role;
import rw.venus.geosmartmanager.domain.UserStatus;
import rw.venus.geosmartmanager.entity.UserEntity;
import rw.venus.geosmartmanager.repo.UserRepository;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@Service
public class AuthService {
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;
    private final AuditService auditService;
    private final GoogleTokenVerifierService googleTokenVerifierService;

    public AuthService(UserRepository userRepository,
                       PasswordEncoder passwordEncoder,
                       AuthenticationManager authenticationManager,
                       JwtService jwtService,
                       AuditService auditService,
                       GoogleTokenVerifierService googleTokenVerifierService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.authenticationManager = authenticationManager;
        this.jwtService = jwtService;
        this.auditService = auditService;
        this.googleTokenVerifierService = googleTokenVerifierService;
    }

    public AuthDtos.AuthResponse register(AuthDtos.RegisterRequest request) {
        if (userRepository.findByEmailIgnoreCase(request.email()).isPresent()) {
            throw new IllegalArgumentException("Email already registered");
        }

        Role role = request.role() != null ? request.role() : Role.ENGINEER;
        if (role == Role.ADMIN && userRepository.existsByRole(Role.ADMIN)) {
            role = Role.ENGINEER;
        }

        Instant now = Instant.now();
        UserEntity user = UserEntity.builder()
                .fullName(request.fullName())
                .email(request.email().toLowerCase())
                .passwordHash(passwordEncoder.encode(request.password()))
                .role(role)
                .status(UserStatus.ACTIVE)
                .createdAt(now)
                .lastActiveAt(now)
                .build();
        userRepository.save(user);
        auditService.log(user.getEmail(), "REGISTER", "User", user.getId(), "User registration");
        return buildAuthResponse(user);
    }

    public AuthDtos.AuthResponse login(AuthDtos.LoginRequest request) {
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.email(), request.password()));
        SecurityContextHolder.getContext().setAuthentication(authentication);
        UserEntity user = (UserEntity) authentication.getPrincipal();
        user.setStatus(UserStatus.ACTIVE);
        user.setLastActiveAt(Instant.now());
        userRepository.save(user);
        auditService.log(user.getEmail(), "LOGIN", "User", user.getId(), "User login");
        return buildAuthResponse(user);
    }

    public AuthDtos.AuthResponse loginWithGoogle(AuthDtos.GoogleLoginRequest request) {
        GoogleTokenVerifierService.GoogleProfile googleProfile = googleTokenVerifierService.verify(request.idToken());
        Instant now = Instant.now();

        var existingUser = userRepository.findByEmailIgnoreCase(googleProfile.email());
        boolean isNewUser = existingUser.isEmpty();
        UserEntity user = existingUser.orElseGet(() -> createGoogleUser(googleProfile, now));

        if (user.getStatus() == UserStatus.SUSPENDED) {
            throw new IllegalArgumentException("Account is suspended. Contact your administrator.");
        }

        if (user.getId() != null && (user.getFullName() == null || user.getFullName().isBlank())) {
            user.setFullName(googleProfile.fullName());
        }

        user.setStatus(UserStatus.ACTIVE);
        user.setLastActiveAt(now);
        userRepository.save(user);

        String action = isNewUser ? "REGISTER_GOOGLE" : "LOGIN_GOOGLE";
        String details = action.equals("REGISTER_GOOGLE")
                ? "User registration via Google"
                : "User login via Google";
        auditService.log(user.getEmail(), action, "User", user.getId(), details);
        return buildAuthResponse(user);
    }

    private UserEntity createGoogleUser(GoogleTokenVerifierService.GoogleProfile googleProfile, Instant now) {
        return UserEntity.builder()
                .fullName(googleProfile.fullName())
                .email(googleProfile.email().toLowerCase())
                .passwordHash(passwordEncoder.encode(UUID.randomUUID().toString()))
                .role(Role.ENGINEER)
                .status(UserStatus.ACTIVE)
                .createdAt(now)
                .lastActiveAt(now)
                .build();
    }

    private AuthDtos.AuthResponse buildAuthResponse(UserEntity user) {
        String token = jwtService.generateToken(user.getEmail(), Map.of("role", user.getRole().name()));
        return new AuthDtos.AuthResponse(token, new AuthDtos.UserResponse(
                user.getId(),
                user.getFullName(),
                user.getEmail(),
                user.getRole(),
                user.getStatus(),
                user.getProfessionalLicense(),
                user.getLastActiveAt()
        ));
    }
}
