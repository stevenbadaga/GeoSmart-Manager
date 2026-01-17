package rw.venus.geosmartmanager.api.controller;

import rw.venus.geosmartmanager.api.dto.UserDtos;
import rw.venus.geosmartmanager.service.CurrentUserService;
import rw.venus.geosmartmanager.service.UserService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/users")
@PreAuthorize("hasRole('ADMIN')")
public class UserController {
    private final UserService userService;
    private final CurrentUserService currentUserService;

    public UserController(UserService userService, CurrentUserService currentUserService) {
        this.userService = userService;
        this.currentUserService = currentUserService;
    }

    @GetMapping
    public List<UserDtos.UserDto> list() {
        return userService.list();
    }

    @PostMapping
    public UserDtos.UserDto create(@Valid @RequestBody UserDtos.CreateUserRequest req) {
        return userService.create(currentUserService.requireCurrentUser(), req);
    }

    @PatchMapping("/{id}/status")
    public UserDtos.UserDto updateStatus(@PathVariable UUID id, @RequestBody UserDtos.UpdateUserStatusRequest req) {
        return userService.updateStatus(currentUserService.requireCurrentUser(), id, req);
    }
}

