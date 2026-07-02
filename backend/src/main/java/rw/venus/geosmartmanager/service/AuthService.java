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
import rw.venus.geosmartmanager.domain.KycStatus;
import rw.venus.geosmartmanager.domain.UserStatus;
import rw.venus.geosmartmanager.entity.ClientEntity;
import rw.venus.geosmartmanager.entity.UserEntity;
import rw.venus.geosmartmanager.repo.ClientRepository;
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
    private final UserSessionService userSessionService;
    private final ClientRepository clientRepository;

    public AuthService(UserRepository userRepository,
                       PasswordEncoder passwordEncoder,
                       AuthenticationManager authenticationManager,
                       JwtService jwtService,
                       AuditService auditService,
                       GoogleTokenVerifierService googleTokenVerifierService,
                       UserSessionService userSessionService,
                       ClientRepository clientRepository) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.authenticationManager = authenticationManager;
        this.jwtService = jwtService;
        this.auditService = auditService;
        this.googleTokenVerifierService = googleTokenVerifierService;
        this.userSessionService = userSessionService;
        this.clientRepository = clientRepository;
    }

    public AuthDtos.AuthResponse register(AuthDtos.RegisterRequest request) {
        String trimmedEmail = request.email() != null ? request.email().trim().toLowerCase() : "";
        if (userRepository.findByEmailIgnoreCase(trimmedEmail).isPresent()) {
            throw new IllegalArgumentException("Email already registered");
        }

        Role role = request.role() != null ? request.role() : Role.SURVEYOR;
        if (role == Role.ADMIN) {
            throw new IllegalArgumentException("Admin accounts cannot be created from public registration.");
        }
        if (role != Role.SURVEYOR && role != Role.CLIENT) {
            role = Role.SURVEYOR;
        }

        Instant now = Instant.now();
        UserEntity user = UserEntity.builder()
                .fullName(request.fullName())
                .email(trimmedEmail)
                .passwordHash(passwordEncoder.encode(request.password()))
                .role(role)
                .status(UserStatus.ACTIVE)
                .createdAt(now)
                .lastActiveAt(now)
                .build();
        userRepository.save(user);
        ensureClientProfile(user, now);
        auditService.log(user.getEmail(), "REGISTER", "User", user.getId(), "User registration");
        return buildAuthResponse(user);
    }

    public AuthDtos.AuthResponse login(AuthDtos.LoginRequest request) {
        String trimmedEmail = request.email() != null ? request.email().trim() : "";
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(trimmedEmail, request.password()));
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
        ensureClientProfile(user, now);

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
                .role(Role.SURVEYOR)
                .status(UserStatus.ACTIVE)
                .createdAt(now)
                .lastActiveAt(now)
                .build();
    }

    private void ensureClientProfile(UserEntity user, Instant now) {
        if (user == null || user.getRole() != Role.CLIENT) {
            return;
        }
        if (clientRepository.findByUserId(user.getId()).isPresent()) {
            return;
        }
        ClientEntity client = ClientEntity.builder()
                .name(user.getFullName())
                .contactEmail(user.getEmail())
                .kycStatus(KycStatus.PENDING)
                .userId(user.getId())
                .createdAt(now != null ? now : Instant.now())
                .build();
        clientRepository.save(client);
    }

    private AuthDtos.AuthResponse buildAuthResponse(UserEntity user) {
        var session = userSessionService.createSession(user);
        String token = jwtService.generateToken(user.getEmail(), Map.of(
                "role", user.getRole().name(),
                "sid", session.getSessionId()
        ));
        return new AuthDtos.AuthResponse(token, new AuthDtos.UserResponse(
                user.getId(),
                user.getFullName(),
                user.getEmail(),
                user.getRole(),
                user.getStatus(),
                user.getProfessionalLicense(),
                user.getOrganization(),
                user.getSpecialization(),
                user.getCertifications(),
                user.getLastActiveAt(),
                user.getAvatarUrl()
        ));
    }

}
