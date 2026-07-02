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
import rw.venus.geosmartmanager.repo.UserRepository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Component
public class DemoUserSeeder implements CommandLineRunner {
    private static final Logger log = LoggerFactory.getLogger(DemoUserSeeder.class);

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final String defaultTestPassword;

    public DemoUserSeeder(UserRepository userRepository,
                          PasswordEncoder passwordEncoder,
                          @Value("${app.demo.default-test-password}") String defaultTestPassword) {
        this.userRepository = userRepository;
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

        for (DemoUser demoUser : demoUsers) {
            upsertDemoUser(demoUser);
        }

        log.info("Demo accounts ensured: {} account(s). Password matches default: {}. Configure DEFAULT_TEST_PASSWORD for local test login.", demoUsers.size(), "GeoSmart@2026".equals(defaultTestPassword));
    }

    private void upsertDemoUser(DemoUser demoUser) {
        Optional<UserEntity> existingUser = userRepository.findByEmailIgnoreCase(demoUser.email());
        if (existingUser.isPresent()) {
            return;
        }

        Instant now = Instant.now();
        UserEntity user = UserEntity.builder()
                .fullName(demoUser.fullName())
                .email(demoUser.email().toLowerCase())
                .passwordHash(passwordEncoder.encode(defaultTestPassword))
                .role(demoUser.role())
                .status(UserStatus.ACTIVE)
                .professionalLicense(demoUser.professionalLicense())
                .organization(demoUser.organization())
                .specialization(demoUser.specialization())
                .certifications(demoUser.certifications())
                .createdAt(now)
                .lastActiveAt(now)
                .build();
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
