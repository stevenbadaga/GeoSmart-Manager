package rw.venus.geosmartmanager.service;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.web.context.request.RequestAttributes;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;
import rw.venus.geosmartmanager.entity.UserEntity;

@Service
public class CurrentUserService {
    public UserEntity getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof UserEntity user) {
            return user;
        }
        return null;
    }

    public String getCurrentUserEmail() {
        UserEntity user = getCurrentUser();
        return user != null ? user.getEmail() : "system";
    }

    public String getCurrentSessionId() {
        RequestAttributes attributes = RequestContextHolder.getRequestAttributes();
        if (attributes instanceof ServletRequestAttributes servletRequestAttributes) {
            Object value = servletRequestAttributes.getRequest().getAttribute("sessionId");
            return value != null ? value.toString() : null;
        }
        return null;
    }
}
