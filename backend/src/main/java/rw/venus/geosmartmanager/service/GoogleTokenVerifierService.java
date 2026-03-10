package rw.venus.geosmartmanager.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;
import rw.venus.geosmartmanager.config.AppProperties;

import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Locale;

@Service
public class GoogleTokenVerifierService {
    private static final String GOOGLE_TOKEN_INFO_URL = "https://oauth2.googleapis.com/tokeninfo?id_token=";
    private static final String ISSUER = "accounts.google.com";
    private static final String ISSUER_HTTPS = "https://accounts.google.com";

    private final AppProperties appProperties;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;

    public GoogleTokenVerifierService(AppProperties appProperties, ObjectMapper objectMapper) {
        this.appProperties = appProperties;
        this.objectMapper = objectMapper;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(8))
                .build();
    }

    public GoogleProfile verify(String idToken) {
        if (idToken == null || idToken.isBlank()) {
            throw new IllegalArgumentException("Google credential is missing.");
        }

        String configuredClientId = appProperties.getOauth().getGoogleClientId();
        if (configuredClientId == null || configuredClientId.isBlank()) {
            throw new IllegalArgumentException("Google Sign-In is not configured on the server.");
        }

        JsonNode payload = fetchTokenInfo(idToken);

        String audience = payload.path("aud").asText("");
        if (!configuredClientId.equals(audience)) {
            throw new IllegalArgumentException("Google credential audience mismatch.");
        }

        String issuer = payload.path("iss").asText("");
        if (!ISSUER.equalsIgnoreCase(issuer) && !ISSUER_HTTPS.equalsIgnoreCase(issuer)) {
            throw new IllegalArgumentException("Invalid Google token issuer.");
        }

        String email = payload.path("email").asText("").trim().toLowerCase(Locale.ROOT);
        if (email.isBlank()) {
            throw new IllegalArgumentException("Google account email is missing.");
        }

        if (!isEmailVerified(payload.path("email_verified"))) {
            throw new IllegalArgumentException("Google account email must be verified.");
        }

        String fullName = payload.path("name").asText("").trim();
        if (fullName.isBlank()) {
            fullName = deriveNameFromEmail(email);
        }

        String googleSubject = payload.path("sub").asText("");
        return new GoogleProfile(googleSubject, email, fullName);
    }

    private JsonNode fetchTokenInfo(String idToken) {
        try {
            String encodedToken = URLEncoder.encode(idToken, StandardCharsets.UTF_8);
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(GOOGLE_TOKEN_INFO_URL + encodedToken))
                    .timeout(Duration.ofSeconds(10))
                    .GET()
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() != 200) {
                throw new IllegalArgumentException("Invalid Google credential.");
            }
            return objectMapper.readTree(response.body());
        } catch (IllegalArgumentException exception) {
            throw exception;
        } catch (IOException | InterruptedException exception) {
            if (exception instanceof InterruptedException) {
                Thread.currentThread().interrupt();
            }
            throw new IllegalArgumentException("Google Sign-In is temporarily unavailable.");
        }
    }

    private boolean isEmailVerified(JsonNode node) {
        if (node.isBoolean()) {
            return node.asBoolean();
        }
        return "true".equalsIgnoreCase(node.asText(""));
    }

    private String deriveNameFromEmail(String email) {
        int atIndex = email.indexOf('@');
        if (atIndex <= 0) {
            return "GeoSmart User";
        }
        String localPart = email.substring(0, atIndex).replace('.', ' ').replace('_', ' ').trim();
        if (localPart.isBlank()) {
            return "GeoSmart User";
        }
        String[] tokens = localPart.split("\\s+");
        StringBuilder builder = new StringBuilder();
        for (String token : tokens) {
            if (token.isBlank()) {
                continue;
            }
            if (builder.length() > 0) {
                builder.append(' ');
            }
            builder.append(Character.toUpperCase(token.charAt(0)));
            if (token.length() > 1) {
                builder.append(token.substring(1).toLowerCase(Locale.ROOT));
            }
        }
        return builder.isEmpty() ? "GeoSmart User" : builder.toString();
    }

    public record GoogleProfile(String subject, String email, String fullName) {
    }
}
