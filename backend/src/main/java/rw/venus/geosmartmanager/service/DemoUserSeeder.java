package rw.venus.geosmartmanager.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import rw.venus.geosmartmanager.domain.Role;
import rw.venus.geosmartmanager.domain.UserStatus;
import rw.venus.geosmartmanager.entity.UserEntity;
import rw.venus.geosmartmanager.repo.PasswordResetTokenRepository;
import rw.venus.geosmartmanager.repo.ReportRepository;
import rw.venus.geosmartmanager.repo.UserRepository;
import rw.venus.geosmartmanager.repo.UserSessionRepository;

import java.time.Instant;
import java.util.List;
import java.util.Set;

@Component
public class DemoUserSeeder implements CommandLineRunner {
    private static final Logger log = LoggerFactory.getLogger(DemoUserSeeder.class);

    private final UserRepository userRepository;
    private final UserSessionRepository userSessionRepository;
    private final PasswordResetTokenRepository passwordResetTokenRepository;
    private final ReportRepository reportRepository;
    private final PasswordEncoder passwordEncoder;
    private final String defaultTestPassword;

    public DemoUserSeeder(UserRepository userRepository,
                          UserSessionRepository userSessionRepository,
                          PasswordResetTokenRepository passwordResetTokenRepository,
                          ReportRepository reportRepository,
                          PasswordEncoder passwordEncoder,
                          @Value("${app.demo.default-test-password}") String defaultTestPassword) {
        this.userRepository = userRepository;
        this.userSessionRepository = userSessionRepository;
        this.passwordResetTokenRepository = passwordResetTokenRepository;
        this.reportRepository = reportRepository;
        this.passwordEncoder = passwordEncoder;
        this.defaultTestPassword = defaultTestPassword;
    }

    @Override
    public void run(String... args) {
        List<DemoUser> demoUsers = List.of(
                new DemoUser("Badaga Class", "badagaclass@gmail.com", Role.ADMIN, null, "GeoSmart Manager", "Administration", "Default Admin demo account"),
                new DemoUser("Badaga Steven", "badagasteven6@gmail.com", Role.SURVEYOR, null, "GeoSmart Manager", "Land Surveyor", "Default Land Surveyor demo account"),
                new DemoUser("Badaga Irankunda", "badagairankunda@gmail.com", Role.CLIENT, null, "GeoSmart Manager", "Client Review", "Default Client demo account")
        );

        removeNonDemoUsers(demoUsers);

        for (DemoUser demoUser : demoUsers) {
            upsertDemoUser(demoUser);
        }

        log.info("Demo accounts ensured: {} account(s). Configure DEFAULT_TEST_PASSWORD for local test login.", demoUsers.size());
    }

    private void removeNonDemoUsers(List<DemoUser> demoUsers) {
        Set<String> demoEmails = demoUsers.stream()
                .map(DemoUser::email)
                .map(String::toLowerCase)
                .collect(java.util.stream.Collectors.toSet());
        List<UserEntity> nonDemoUsers = userRepository.findAll().stream()
                .filter(user -> user.getEmail() == null || !demoEmails.contains(user.getEmail().toLowerCase()))
                .toList();

        for (UserEntity user : nonDemoUsers) {
            reportRepository.findByGeneratedById(user.getId()).forEach(report -> {
                report.setGeneratedBy(null);
                reportRepository.save(report);
            });
            userSessionRepository.deleteAll(userSessionRepository.findByUserIdOrderByLastSeenAtDesc(user.getId()));
            passwordResetTokenRepository.deleteAll(passwordResetTokenRepository.findAll().stream()
                    .filter(token -> token.getUser() != null && token.getUser().getId().equals(user.getId()))
                    .toList());
            userRepository.delete(user);
        }

        if (!nonDemoUsers.isEmpty()) {
            log.info("Removed {} non-demo account(s).", nonDemoUsers.size());
        }
    }

    private void upsertDemoUser(DemoUser demoUser) {
        Instant now = Instant.now();
        UserEntity user = userRepository.findByEmailIgnoreCase(demoUser.email())
                .orElseGet(() -> UserEntity.builder()
                        .passwordHash(passwordEncoder.encode(defaultTestPassword))
                        .email(demoUser.email().toLowerCase())
                        .createdAt(now)
                        .build());

        user.setFullName(demoUser.fullName());
        user.setEmail(demoUser.email().toLowerCase());
        if (user.getPasswordHash() == null || user.getPasswordHash().isBlank()) {
            user.setPasswordHash(passwordEncoder.encode(defaultTestPassword));
        }
        // Keep demo logins deterministic for local testing and presentations.
        user.setPasswordHash(passwordEncoder.encode(defaultTestPassword));
        user.setRole(demoUser.role());
        user.setStatus(UserStatus.ACTIVE);
        user.setProfessionalLicense(demoUser.professionalLicense());
        user.setOrganization(demoUser.organization());
        user.setSpecialization(demoUser.specialization());
        user.setCertifications(demoUser.certifications());
        user.setLastActiveAt(now);
        if (user.getCreatedAt() == null) {
            user.setCreatedAt(now);
        }

        userRepository.save(user);
    }

    private record DemoUser(
            String fullName,
            String email,
            Role role,
            String professionalLicense,
            String organization,
            String specialization,
            String certifications
    ) {
    }
}
