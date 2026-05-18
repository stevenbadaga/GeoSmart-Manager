package rw.venus.geosmartmanager.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import rw.venus.geosmartmanager.domain.Role;
import rw.venus.geosmartmanager.domain.UserStatus;
import rw.venus.geosmartmanager.entity.UserEntity;
import rw.venus.geosmartmanager.repo.UserRepository;

import java.time.Instant;
import java.util.List;

@Component
public class DemoUserSeeder implements CommandLineRunner {
    private static final Logger log = LoggerFactory.getLogger(DemoUserSeeder.class);
    private static final String DEMO_PASSWORD = "GeoSmart@2026";

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public DemoUserSeeder(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) {
        List<DemoUser> demoUsers = List.of(
                new DemoUser("GeoSmart Admin", "admin@geomart.rw", Role.ADMIN, "GS-ADM-001", "GeoSmart Manager", "Platform Administration", "System administration demo account"),
                new DemoUser("GeoSmart Project Manager", "manager@geomart.rw", Role.PROJECT_MANAGER, "GS-PM-001", "GeoSmart Manager", "Project Delivery", "Project management demo account"),
                new DemoUser("GeoSmart Surveyor", "surveyor@geomart.rw", Role.SURVEYOR, "GS-SUR-001", "GeoSmart Survey Unit", "Boundary Survey", "Survey workflow demo account"),
                new DemoUser("GeoSmart Engineer", "engineer@geomart.rw", Role.ENGINEER, "GS-ENG-001", "GeoSmart Engineering", "Subdivision Design", "Engineering workflow demo account"),
                new DemoUser("GeoSmart Civil Engineer", "civil@geomart.rw", Role.CIVIL_ENGINEER, "GS-CIV-001", "GeoSmart Infrastructure", "Infrastructure Planning", "Civil engineering demo account"),
                new DemoUser("GeoSmart Client", "client@geomart.rw", Role.CLIENT, null, "GeoSmart Client Desk", "Client Review", "Client-facing demo account")
        );

        for (DemoUser demoUser : demoUsers) {
            upsertDemoUser(demoUser);
        }

        log.info("Demo accounts ensured: {} account(s) available with password {}", demoUsers.size(), DEMO_PASSWORD);
    }

    private void upsertDemoUser(DemoUser demoUser) {
        Instant now = Instant.now();
        UserEntity user = userRepository.findByEmailIgnoreCase(demoUser.email())
                .orElseGet(() -> UserEntity.builder()
                        .passwordHash(passwordEncoder.encode(DEMO_PASSWORD))
                        .email(demoUser.email().toLowerCase())
                        .createdAt(now)
                        .build());

        user.setFullName(demoUser.fullName());
        user.setEmail(demoUser.email().toLowerCase());
        if (user.getPasswordHash() == null || user.getPasswordHash().isBlank()) {
            user.setPasswordHash(passwordEncoder.encode(DEMO_PASSWORD));
        }
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
