package rw.venus.geosmartmanager.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jws;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.time.Instant;
import java.util.UUID;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import rw.venus.geosmartmanager.entity.UserSessionEntity;
import rw.venus.geosmartmanager.repo.UserSessionRepository;

@Component
public class JwtAuthFilter extends OncePerRequestFilter {
    private final JwtService jwtService;
    private final AppUserDetailsService userDetailsService;
    private final UserSessionRepository userSessionRepository;

    public JwtAuthFilter(JwtService jwtService, AppUserDetailsService userDetailsService, UserSessionRepository userSessionRepository) {
        this.jwtService = jwtService;
        this.userDetailsService = userDetailsService;
        this.userSessionRepository = userSessionRepository;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        String header = request.getHeader("Authorization");
        if (header == null || !header.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        String token = header.substring("Bearer ".length()).trim();
        try {
            Jws<Claims> jws = jwtService.parse(token);
            String username = jws.getPayload().getSubject();
            if (username == null || username.isBlank()) {
                filterChain.doFilter(request, response);
                return;
            }

            String sidRaw = jws.getPayload().get("sid", String.class);
            UUID sessionId = null;
            if (sidRaw != null && !sidRaw.isBlank()) {
                try {
                    sessionId = UUID.fromString(sidRaw);
                } catch (IllegalArgumentException ignored) {
                    // ignore invalid session id
                }
            }
            if (sessionId == null) {
                filterChain.doFilter(request, response);
                return;
            }

            UserSessionEntity session = userSessionRepository.findById(sessionId).orElse(null);
            if (session == null || session.getRevokedAt() != null) {
                filterChain.doFilter(request, response);
                return;
            }

            if (SecurityContextHolder.getContext().getAuthentication() == null) {
                UserDetails userDetails = userDetailsService.loadUserByUsername(username);
                UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
                        userDetails,
                        null,
                        userDetails.getAuthorities()
                );
                auth.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                SecurityContextHolder.getContext().setAuthentication(auth);
            }

            if (session.getUser() != null && username.equals(session.getUser().getUsername())) {
                session.setLastSeenAt(Instant.now());
                userSessionRepository.save(session);
            }
        } catch (Exception ignored) {
            // Ignore invalid tokens (will be treated as unauthenticated by downstream security)
        }

        filterChain.doFilter(request, response);
    }
}
