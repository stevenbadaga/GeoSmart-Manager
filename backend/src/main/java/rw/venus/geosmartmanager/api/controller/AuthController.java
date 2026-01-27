package rw.venus.geosmartmanager.api.controller;

import rw.venus.geosmartmanager.api.dto.AuthDtos;
import rw.venus.geosmartmanager.repo.UserRepository;
import rw.venus.geosmartmanager.service.AuthService;
import rw.venus.geosmartmanager.service.CurrentUserService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private final AuthService authService;
    private final CurrentUserService currentUserService;
    private final UserRepository userRepository;

    public AuthController(AuthService authService, CurrentUserService currentUserService, UserRepository userRepository) {
        this.authService = authService;
        this.currentUserService = currentUserService;
        this.userRepository = userRepository;
    }

    @PostMapping("/login")
    public AuthDtos.LoginResponse login(@Valid @RequestBody AuthDtos.LoginRequest req, HttpServletRequest request) {
        return authService.login(req, request);
    }

    @PostMapping("/register")
    public AuthDtos.LoginResponse register(@Valid @RequestBody AuthDtos.RegisterRequest req, HttpServletRequest request) {
        return authService.register(req, request);
    }

    @GetMapping("/me")
    public AuthDtos.UserDto me() {
        return authService.toDto(currentUserService.requireCurrentUser());
    }

    @GetMapping("/sessions")
    public List<AuthDtos.SessionDto> sessions() {
        return authService.listSessions(currentUserService.requireCurrentUser());
    }

    @PostMapping("/sessions/{sessionId}/revoke")
    public void revokeSession(@PathVariable UUID sessionId) {
        authService.revokeSession(currentUserService.requireCurrentUser(), sessionId);
    }

    @GetMapping("/mfa/setup")
    public AuthDtos.MfaSetupResponse mfaSetup() {
        return authService.beginMfaSetup(currentUserService.requireCurrentUser());
    }

    @PostMapping("/mfa/enable")
    public AuthDtos.UserDto enableMfa(@Valid @RequestBody AuthDtos.MfaVerifyRequest req) {
        return authService.enableMfa(currentUserService.requireCurrentUser(), req);
    }

    @PostMapping("/mfa/disable")
    public AuthDtos.UserDto disableMfa(@Valid @RequestBody AuthDtos.MfaVerifyRequest req) {
        return authService.disableMfa(currentUserService.requireCurrentUser(), req);
    }

    @PutMapping("/profile")
    public AuthDtos.UserDto updateProfile(@RequestBody AuthDtos.UpdateProfileRequest req) {
        return authService.updateProfile(currentUserService.requireCurrentUser(), req);
    }

    @GetMapping("/activity")
    public List<rw.venus.geosmartmanager.api.dto.AuditDtos.AuditLogDto> activity(
            @org.springframework.web.bind.annotation.RequestParam(defaultValue = "0") int page,
            @org.springframework.web.bind.annotation.RequestParam(defaultValue = "50") int size
    ) {
        return authService.listMyActivity(currentUserService.requireCurrentUser(), page, size);
    }

    @GetMapping("/bootstrap")
    public AuthDtos.BootstrapStatusResponse bootstrapStatus() {
        return new AuthDtos.BootstrapStatusResponse(userRepository.count() > 0, "admin");
    }
}
