package rw.venus.geosmartmanager.api.controller;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import rw.venus.geosmartmanager.api.dto.AppDtos;
import rw.venus.geosmartmanager.entity.UserEntity;
import rw.venus.geosmartmanager.service.NotificationService;

import java.util.List;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {
    private final NotificationService notificationService;

    public NotificationController(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    @GetMapping
    public List<AppDtos.NotificationResponse> list(@AuthenticationPrincipal UserEntity user) {
        return notificationService.listForUser(user.getId()).stream()
                .map(n -> new AppDtos.NotificationResponse(
                        n.getId(), n.getTitle(), n.getMessage(), n.getType(), n.getRelatedProjectId(), n.isRead(), n.getCreatedAt()
                )).toList();
    }

    @GetMapping("/unread-count")
    public long unreadCount(@AuthenticationPrincipal UserEntity user) {
        return notificationService.countUnread(user.getId());
    }

    @PatchMapping("/{id}/read")
    public void markAsRead(@PathVariable Long id) {
        notificationService.markAsRead(id);
    }

    @PostMapping("/{id}/read")
    public void markAsReadPost(@PathVariable Long id) {
        notificationService.markAsRead(id);
    }

    @PatchMapping("/read-all")
    public void markAllAsRead(@AuthenticationPrincipal UserEntity user) {
        notificationService.markAllAsRead(user.getId());
    }

    @PostMapping("/read-all")
    public void markAllAsReadPost(@AuthenticationPrincipal UserEntity user) {
        notificationService.markAllAsRead(user.getId());
    }
}
