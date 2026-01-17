package rw.venus.geosmartmanager.service;

import rw.venus.geosmartmanager.api.dto.AuthDtos;
import rw.venus.geosmartmanager.entity.UserEntity;
import rw.venus.geosmartmanager.exception.ApiException;
import rw.venus.geosmartmanager.repo.UserRepository;
import rw.venus.geosmartmanager.security.JwtService;
import java.util.Optional;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class AuthService {
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public AuthService(UserRepository userRepository, PasswordEncoder passwordEncoder, JwtService jwtService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
    }

    public AuthDtos.LoginResponse login(AuthDtos.LoginRequest req) {
        Optional<UserEntity> opt = userRepository.findByUsername(req.username());
        if (opt.isEmpty()) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "INVALID_CREDENTIALS", "Invalid username or password");
        }

        UserEntity user = opt.get();
        if (!user.isEnabled()) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "USER_DISABLED", "Account is disabled");
        }

        if (!passwordEncoder.matches(req.password(), user.getPasswordHash())) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "INVALID_CREDENTIALS", "Invalid username or password");
        }

        String token = jwtService.createToken(user.getUsername(), user.getRole());
        return new AuthDtos.LoginResponse(token, toDto(user));
    }

    public AuthDtos.UserDto toDto(UserEntity user) {
        return new AuthDtos.UserDto(
                user.getId(),
                user.getUsername(),
                user.getEmail(),
                user.getRole(),
                user.isEnabled(),
                user.getCreatedAt()
        );
    }
}

