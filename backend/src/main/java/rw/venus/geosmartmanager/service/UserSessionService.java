package rw.venus.geosmartmanager.service;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.stereotype.Service;
import org.springframework.web.context.request.RequestAttributes;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;
import rw.venus.geosmartmanager.entity.UserEntity;
import rw.venus.geosmartmanager.entity.UserSessionEntity;
import rw.venus.geosmartmanager.repo.UserSessionRepository;

import java.time.Instant;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

@Service
public class UserSessionService {
    private final UserSessionRepository userSessionRepository;

    public UserSessionService(UserSessionRepository userSessionRepository) {
        this.userSessionRepository = userSessionRepository;
    }

    public UserSessionEntity createSession(UserEntity user) {
        Instant now = Instant.now();
        String userAgent = resolveUserAgent();
        UserSessionEntity session = UserSessionEntity.builder()
                .user(user)
                .sessionId(UUID.randomUUID().toString())
                .deviceLabel(resolveDeviceLabel(userAgent))
                .userAgent(userAgent)
                .ipAddress(resolveIpAddress())
                .createdAt(now)
                .lastSeenAt(now)
                .build();
        return userSessionRepository.save(session);
    }

    public boolean isSessionActive(String sessionId) {
        if (sessionId == null || sessionId.isBlank()) {
            return false;
        }
        return userSessionRepository.findBySessionId(sessionId)
                .filter(session -> session.getRevokedAt() == null)
                .isPresent();
    }

    public void touchSession(String sessionId) {
        if (sessionId == null || sessionId.isBlank()) {
            return;
        }
        userSessionRepository.findBySessionId(sessionId)
                .filter(session -> session.getRevokedAt() == null)
                .ifPresent(session -> {
                    Instant now = Instant.now();
                    if (session.getLastSeenAt() == null || session.getLastSeenAt().isBefore(now.minusSeconds(30))) {
                        session.setLastSeenAt(now);
                        userSessionRepository.save(session);
                    }
                });
    }

    public List<UserSessionEntity> listByUserId(Long userId) {
        return userSessionRepository.findByUserIdOrderByLastSeenAtDesc(userId);
    }

    public UserSessionEntity getUserSession(Long userId, String sessionId) {
        return userSessionRepository.findBySessionIdAndUserId(sessionId, userId)
                .orElseThrow(() -> new IllegalArgumentException("Session not found"));
    }

    public boolean revokeSession(Long userId, String sessionId) {
        UserSessionEntity session = getUserSession(userId, sessionId);
        if (session.getRevokedAt() != null) {
            return false;
        }
        session.setRevokedAt(Instant.now());
        userSessionRepository.save(session);
        return true;
    }

    public int revokeOtherSessions(Long userId, String currentSessionId) {
        if (currentSessionId == null || currentSessionId.isBlank()) {
            return 0;
        }
        int revoked = 0;
        for (UserSessionEntity session : userSessionRepository.findByUserIdAndRevokedAtIsNullAndSessionIdNot(userId, currentSessionId)) {
            session.setRevokedAt(Instant.now());
            userSessionRepository.save(session);
            revoked += 1;
        }
        return revoked;
    }

    private HttpServletRequest getCurrentRequest() {
        RequestAttributes attributes = RequestContextHolder.getRequestAttributes();
        if (attributes instanceof ServletRequestAttributes servletRequestAttributes) {
            return servletRequestAttributes.getRequest();
        }
        return null;
    }

    private String resolveUserAgent() {
        HttpServletRequest request = getCurrentRequest();
        return request != null ? trimToNull(request.getHeader("User-Agent")) : null;
    }

    private String resolveIpAddress() {
        HttpServletRequest request = getCurrentRequest();
        if (request == null) {
            return null;
        }
        String forwarded = trimToNull(request.getHeader("X-Forwarded-For"));
        if (forwarded != null) {
            int commaIndex = forwarded.indexOf(',');
            return commaIndex >= 0 ? forwarded.substring(0, commaIndex).trim() : forwarded;
        }
        return trimToNull(request.getRemoteAddr());
    }

    private String resolveDeviceLabel(String userAgent) {
        if (userAgent == null || userAgent.isBlank()) {
            return "Unknown device";
        }
        String normalized = userAgent.toLowerCase(Locale.ROOT);
        String platform = "Desktop";
        if (normalized.contains("android")) {
            platform = "Android";
        } else if (normalized.contains("iphone") || normalized.contains("ipad") || normalized.contains("ios")) {
            platform = "iOS";
        } else if (normalized.contains("mac")) {
            platform = "macOS";
        } else if (normalized.contains("windows")) {
            platform = "Windows";
        } else if (normalized.contains("linux")) {
            platform = "Linux";
        }

        String browser = "Browser";
        if (normalized.contains("edg")) {
            browser = "Edge";
        } else if (normalized.contains("chrome")) {
            browser = "Chrome";
        } else if (normalized.contains("firefox")) {
            browser = "Firefox";
        } else if (normalized.contains("safari")) {
            browser = "Safari";
        }

        return platform + " - " + browser;
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
