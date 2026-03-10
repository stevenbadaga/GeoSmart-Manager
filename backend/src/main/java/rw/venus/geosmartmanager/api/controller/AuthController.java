package rw.venus.geosmartmanager.api.controller;

import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
import rw.venus.geosmartmanager.api.dto.AuthDtos;
import rw.venus.geosmartmanager.config.AppProperties;
import rw.venus.geosmartmanager.service.AuthService;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private final AuthService authService;
    private final AppProperties appProperties;

    public AuthController(AuthService authService, AppProperties appProperties) {
        this.authService = authService;
        this.appProperties = appProperties;
    }

    @PostMapping("/register")
    public AuthDtos.AuthResponse register(@Valid @RequestBody AuthDtos.RegisterRequest request) {
        return authService.register(request);
    }

    @PostMapping("/login")
    public AuthDtos.AuthResponse login(@Valid @RequestBody AuthDtos.LoginRequest request) {
        return authService.login(request);
    }

    @PostMapping("/google")
    public AuthDtos.AuthResponse loginWithGoogle(@Valid @RequestBody AuthDtos.GoogleLoginRequest request) {
        return authService.loginWithGoogle(request);
    }

    @GetMapping("/google/config")
    public AuthDtos.GoogleConfigResponse googleConfig() {
        String clientId = appProperties.getOauth().getGoogleClientId();
        boolean enabled = clientId != null && !clientId.isBlank();
        return new AuthDtos.GoogleConfigResponse(enabled, enabled ? clientId : null);
    }
}
