package rw.venus.geosmartmanager.auth;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;
import rw.venus.geosmartmanager.config.JwtService;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class AuthProfileSessionIntegrationTest {
    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private JwtService jwtService;

    @Test
    void registerStoresProfileFieldsAndCreatesManagedSession() throws Exception {
        String email = "register-" + UUID.randomUUID().toString().substring(0, 8) + "@example.com";
        String registerPayload = objectMapper.writeValueAsString(new RegisterPayload(
                "Session Surveyor",
                email,
                "Password123!",
                "SURVEYOR",
                "LS-2026-1001",
                "Venus Surveying",
                "Boundary Survey",
                "RICS, Rwanda Survey Board"
        ));

        JsonNode authNode = readJson(mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(registerPayload))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString());

        String token = authNode.path("token").asText();
        JsonNode userNode = authNode.path("user");

        assertThat(userNode.path("professionalLicense").asText()).isEqualTo("LS-2026-1001");
        assertThat(userNode.path("organization").asText()).isEqualTo("Venus Surveying");
        assertThat(userNode.path("specialization").asText()).isEqualTo("Boundary Survey");
        assertThat(userNode.path("certifications").asText()).contains("RICS");
        assertThat(jwtService.parseToken(token).get("sid", String.class)).isNotBlank();

        JsonNode meNode = readJson(mockMvc.perform(get("/api/users/me")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString());

        assertThat(meNode.path("organization").asText()).isEqualTo("Venus Surveying");
        assertThat(meNode.path("specialization").asText()).isEqualTo("Boundary Survey");

        JsonNode sessionsNode = readJson(mockMvc.perform(get("/api/users/me/sessions")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString());

        assertThat(sessionsNode.isArray()).isTrue();
        assertThat(sessionsNode.size()).isEqualTo(1);
        assertThat(sessionsNode.get(0).path("current").asBoolean()).isTrue();

        mockMvc.perform(post("/api/users/me/logout")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/users/me")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().is4xxClientError());
    }

    @Test
    void revokeOtherSessionsKeepsCurrentTokenAndInvalidatesOlderOne() throws Exception {
        String email = "multi-session-" + UUID.randomUUID().toString().substring(0, 8) + "@example.com";
        String password = "Password123!";

        readJson(mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new RegisterPayload(
                                "Project Manager",
                                email,
                                password,
                                "PROJECT_MANAGER",
                                "",
                                "GeoSmart",
                                "Project Delivery",
                                "PMI"
                        ))))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString());

        JsonNode loginOne = login(email, password);
        String tokenOne = loginOne.path("token").asText();
        JsonNode loginTwo = login(email, password);
        String tokenTwo = loginTwo.path("token").asText();

        JsonNode beforeRevoke = readJson(mockMvc.perform(get("/api/users/me/sessions")
                        .header("Authorization", "Bearer " + tokenTwo))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString());
        assertThat(beforeRevoke.size()).isGreaterThanOrEqualTo(2);

        JsonNode revokeResult = readJson(mockMvc.perform(post("/api/users/me/sessions/revoke-others")
                        .header("Authorization", "Bearer " + tokenTwo)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString());
        assertThat(revokeResult.path("currentSessionRevoked").asBoolean()).isFalse();

        mockMvc.perform(get("/api/users/me")
                        .header("Authorization", "Bearer " + tokenOne))
                .andExpect(status().is4xxClientError());

        mockMvc.perform(get("/api/users/me")
                        .header("Authorization", "Bearer " + tokenTwo))
                .andExpect(status().isOk());

        JsonNode afterRevoke = readJson(mockMvc.perform(get("/api/users/me/sessions")
                        .header("Authorization", "Bearer " + tokenTwo))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString());
        long activeSessions = 0;
        for (JsonNode session : afterRevoke) {
            if (!session.path("revoked").asBoolean()) {
                activeSessions += 1;
            }
        }
        assertThat(activeSessions).isEqualTo(1);
    }

    private JsonNode login(String email, String password) throws Exception {
        return readJson(mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new LoginPayload(email, password))))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString());
    }

    private JsonNode readJson(String json) throws Exception {
        return objectMapper.readTree(json);
    }

    private record RegisterPayload(
            String fullName,
            String email,
            String password,
            String role,
            String professionalLicense,
            String organization,
            String specialization,
            String certifications
    ) {}

    private record LoginPayload(
            String email,
            String password
    ) {}
}
