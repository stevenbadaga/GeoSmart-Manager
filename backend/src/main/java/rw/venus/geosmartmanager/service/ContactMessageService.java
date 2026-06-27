package rw.venus.geosmartmanager.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import rw.venus.geosmartmanager.entity.ContactMessageEntity;
import rw.venus.geosmartmanager.repository.ContactMessageRepository;

import java.time.Instant;
import java.util.List;

@Service
public class ContactMessageService {
    private final ContactMessageRepository contactMessageRepository;
    private final NotificationService notificationService;
    private final rw.venus.geosmartmanager.repo.UserRepository userRepository;
    private final EmailNotificationService emailNotificationService;

    public ContactMessageService(ContactMessageRepository contactMessageRepository,
                                 NotificationService notificationService,
                                 rw.venus.geosmartmanager.repo.UserRepository userRepository,
                                 EmailNotificationService emailNotificationService) {
        this.contactMessageRepository = contactMessageRepository;
        this.notificationService = notificationService;
        this.userRepository = userRepository;
        this.emailNotificationService = emailNotificationService;
    }

    @Transactional
    public ContactMessageEntity submit(String fullName, String email, String subject, String message) {
        ContactMessageEntity entity = contactMessageRepository.save(ContactMessageEntity.builder()
                .fullName(fullName)
                .email(email)
                .subject(subject)
                .message(message)
                .status("NEW")
                .createdAt(Instant.now())
                .build());

        // Notify Admins
        userRepository.findAll().stream()
                .filter(u -> u.getRole() == rw.venus.geosmartmanager.domain.Role.ADMIN)
                .forEach(admin -> {
                    notificationService.create(admin.getId(), "New Contact Message", "From: " + fullName, "INFO", null);
                    emailNotificationService.notifyNewContactMessage(admin.getEmail(), fullName, subject);
                });

        return entity;
    }

    public List<ContactMessageEntity> list() {
        return contactMessageRepository.findAllByOrderByCreatedAtDesc();
    }

    @Transactional
    public void updateStatus(Long id, String status) {
        contactMessageRepository.findById(id).ifPresent(m -> {
            m.setStatus(status);
            contactMessageRepository.save(m);
        });
    }

    public long countNew() {
        return contactMessageRepository.countAllByStatus("NEW");
    }
}
