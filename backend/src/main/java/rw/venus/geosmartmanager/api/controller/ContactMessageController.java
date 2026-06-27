package rw.venus.geosmartmanager.api.controller;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import rw.venus.geosmartmanager.api.dto.AppDtos;
import rw.venus.geosmartmanager.service.ContactMessageService;

import java.util.List;

@RestController
public class ContactMessageController {
    private final ContactMessageService contactMessageService;

    public ContactMessageController(ContactMessageService contactMessageService) {
        this.contactMessageService = contactMessageService;
    }

    @PostMapping("/api/contact/messages")
    public void submit(@RequestBody AppDtos.ContactMessageRequest request) {
        contactMessageService.submit(request.fullName(), request.email(), request.subject(), request.message());
    }

    @GetMapping("/api/admin/contact-messages")
    @PreAuthorize("hasRole('ADMIN')")
    public List<AppDtos.ContactMessageResponse> list() {
        return contactMessageService.list().stream()
                .map(m -> new AppDtos.ContactMessageResponse(
                        m.getId(), m.getFullName(), m.getEmail(), m.getSubject(), m.getMessage(), m.getStatus(), m.getCreatedAt()
                )).toList();
    }

    @GetMapping("/api/admin/contact-messages/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public AppDtos.ContactMessageResponse get(@PathVariable Long id) {
        return contactMessageService.list().stream()
                .filter(m -> m.getId().equals(id))
                .findFirst()
                .map(m -> new AppDtos.ContactMessageResponse(
                        m.getId(), m.getFullName(), m.getEmail(), m.getSubject(), m.getMessage(), m.getStatus(), m.getCreatedAt()
                )).orElseThrow(() -> new IllegalArgumentException("Message not found"));
    }

    @PatchMapping("/api/admin/contact-messages/{id}/read")
    @PreAuthorize("hasRole('ADMIN')")
    public void markAsRead(@PathVariable Long id) {
        contactMessageService.updateStatus(id, "READ");
    }

    @PatchMapping("/api/admin/contact-messages/{id}/replied")
    @PreAuthorize("hasRole('ADMIN')")
    public void markAsReplied(@PathVariable Long id) {
        contactMessageService.updateStatus(id, "REPLIED");
    }

    @PatchMapping("/api/admin/contact-messages/{id}/archive")
    @PreAuthorize("hasRole('ADMIN')")
    public void archive(@PathVariable Long id) {
        contactMessageService.updateStatus(id, "ARCHIVED");
    }
}
