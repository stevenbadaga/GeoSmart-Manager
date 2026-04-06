package rw.venus.geosmartmanager.api.controller;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import rw.venus.geosmartmanager.api.dto.AuthDtos;
import rw.venus.geosmartmanager.api.dto.UserDtos;
import rw.venus.geosmartmanager.entity.UserEntity;
import rw.venus.geosmartmanager.service.UserService;

import java.util.List;

@RestController
@RequestMapping("/api/users")
@Validated
public class UserController {
    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping("/me")
    public AuthDtos.UserResponse me() {
        UserEntity user = userService.getCurrent();
        return toResponse(user);
    }

    @PutMapping("/me")
    public AuthDtos.UserResponse updateCurrentProfile(@Validated @RequestBody UserDtos.UpdateProfileRequest request) {
        return toResponse(userService.updateCurrentProfile(request));
    }

    @PostMapping("/me/offline")
    public AuthDtos.UserResponse markOffline() {
        return toResponse(userService.markOffline());
    }

    @PostMapping("/me/online")
    public AuthDtos.UserResponse markOnline() {
        return toResponse(userService.markOnline());
    }

    @PostMapping("/me/logout")
    public UserDtos.SessionActionResponse logout() {
        return userService.logoutCurrentSession();
    }

    @GetMapping("/me/sessions")
    public List<UserDtos.UserSessionResponse> listMySessions() {
        return userService.listCurrentSessions();
    }

    @PostMapping("/me/sessions/revoke-others")
    public UserDtos.SessionActionResponse revokeOtherSessions() {
        return userService.revokeOtherSessions();
    }

    @PostMapping("/me/sessions/{sessionId}/revoke")
    public UserDtos.SessionActionResponse revokeSession(@PathVariable String sessionId) {
        return userService.revokeSession(sessionId);
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public List<AuthDtos.UserResponse> list() {
        return userService.list().stream().map(this::toResponse).toList();
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public AuthDtos.UserResponse create(@Validated @RequestBody UserDtos.CreateUserRequest request) {
        return toResponse(userService.create(request));
    }

    @PutMapping("/{userId}")
    @PreAuthorize("hasRole('ADMIN')")
    public AuthDtos.UserResponse update(@PathVariable Long userId,
                                        @Validated @RequestBody UserDtos.UpdateUserRequest request) {
        return toResponse(userService.update(userId, request));
    }

    private AuthDtos.UserResponse toResponse(UserEntity user) {
        return new AuthDtos.UserResponse(
                user.getId(),
                user.getFullName(),
                user.getEmail(),
                user.getRole(),
                user.getStatus(),
                user.getProfessionalLicense(),
                user.getOrganization(),
                user.getSpecialization(),
                user.getCertifications(),
                user.getLastActiveAt()
        );
    }
}
