package rw.venus.geosmartmanager.service;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
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
}
