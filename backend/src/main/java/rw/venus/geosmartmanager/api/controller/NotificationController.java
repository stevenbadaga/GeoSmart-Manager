package rw.venus.geosmartmanager.api.controller;

import rw.venus.geosmartmanager.api.dto.NotificationDtos;
import rw.venus.geosmartmanager.service.CurrentUserService;
import rw.venus.geosmartmanager.service.NotificationService;
import java.util.List;
import java.util.UUID;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class NotificationController {
    private final NotificationService notificationService;
    private final CurrentUserService currentUserService;

    public NotificationController(NotificationService notificationService, CurrentUserService currentUserService) {
        this.notificationService = notificationService;
        this.currentUserService = currentUserService;
    }

    @GetMapping("/notifications")
    public List<NotificationDtos.NotificationDto> list() {
        return notificationService.list(currentUserService.requireCurrentUser());
    }

    @PostMapping("/notifications/{notificationId}/read")
    public void markRead(@PathVariable UUID notificationId) {
        notificationService.markRead(currentUserService.requireCurrentUser(), notificationId);
    }
}

