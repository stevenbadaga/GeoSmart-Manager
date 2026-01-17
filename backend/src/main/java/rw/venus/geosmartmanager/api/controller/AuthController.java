package rw.venus.geosmartmanager.api.controller;

import rw.venus.geosmartmanager.api.dto.AuthDtos;
import rw.venus.geosmartmanager.repo.UserRepository;
import rw.venus.geosmartmanager.service.AuthService;
import rw.venus.geosmartmanager.service.CurrentUserService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
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
    public AuthDtos.LoginResponse login(@Valid @RequestBody AuthDtos.LoginRequest req) {
        return authService.login(req);
    }

    @GetMapping("/me")
    public AuthDtos.UserDto me() {
        return authService.toDto(currentUserService.requireCurrentUser());
    }

    @GetMapping("/bootstrap")
    public AuthDtos.BootstrapStatusResponse bootstrapStatus() {
        return new AuthDtos.BootstrapStatusResponse(userRepository.count() > 0, "admin");
    }
}

