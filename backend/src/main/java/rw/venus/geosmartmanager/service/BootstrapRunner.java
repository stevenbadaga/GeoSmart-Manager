package rw.venus.geosmartmanager.service;

import rw.venus.geosmartmanager.config.AppProperties;
import rw.venus.geosmartmanager.domain.UserRole;
import rw.venus.geosmartmanager.entity.UserEntity;
import rw.venus.geosmartmanager.repo.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class BootstrapRunner implements CommandLineRunner {
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AppProperties appProperties;

    public BootstrapRunner(UserRepository userRepository, PasswordEncoder passwordEncoder, AppProperties appProperties) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.appProperties = appProperties;
    }

    @Override
    public void run(String... args) {
        if (userRepository.count() > 0) {
            return;
        }

        UserEntity admin = new UserEntity();
        admin.setUsername(appProperties.getBootstrap().getAdmin().getUsername());
        admin.setEmail(appProperties.getBootstrap().getAdmin().getEmail());
        admin.setPasswordHash(passwordEncoder.encode(appProperties.getBootstrap().getAdmin().getPassword()));
        admin.setRole(UserRole.ADMIN);
        admin.setEnabled(true);
        userRepository.save(admin);

        System.out.println("=== GeoSmart-Manager bootstrap admin user created ===");
        System.out.println("Username: " + admin.getUsername());
        System.out.println("Password: " + appProperties.getBootstrap().getAdmin().getPassword());
        System.out.println("====================================================");
    }
}

