package rw.venus.geosmartmanager.auth;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;
import rw.venus.geosmartmanager.entity.UserEntity;
import rw.venus.geosmartmanager.repo.PasswordResetTokenRepository;
import rw.venus.geosmartmanager.repo.UserRepository;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = {
        "app.mail.from-address=",
        "app.auth.password-reset-url-base=http://localhost:5173/reset-password"
})
@AutoConfigureMockMvc
@Transactional
class PasswordResetLocalFallbackIntegrationTest {
    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordResetTokenRepository passwordResetTokenRepository;

    @MockBean
    private JavaMailSender mailSender;

    @Test
    void forgotPasswordReturnsLocalResetLinkWhenEmailDeliveryIsNotConfigured() throws Exception {
        String email = "local-reset-" + System.currentTimeMillis() + "@example.com";

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new RegisterPayload(
                                "Local Reset User",
                                email,
                                "Password123!",
                                "SURVEYOR"
                        ))))
                .andExpect(status().isOk());

        JsonNode forgotNode = readJson(mockMvc.perform(post("/api/auth/password/forgot")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new ForgotPayload(email))))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString());

        String resetLink = forgotNode.path("resetLink").asText();
        assertThat(resetLink).startsWith("http://localhost:5173/reset-password?token=");
        assertThat(forgotNode.path("message").asText()).contains("Email delivery is not configured locally");

        String token = resetLink.substring(resetLink.indexOf("token=") + 6);
        JsonNode validateNode = readJson(mockMvc.perform(get("/api/auth/password/reset/validate")
                        .param("token", token))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString());
        assertThat(validateNode.path("valid").asBoolean()).isTrue();

        UserEntity user = userRepository.findByEmailIgnoreCase(email).orElseThrow();
        assertThat(passwordResetTokenRepository.findByUserIdAndUsedAtIsNull(user.getId())).hasSize(1);
        verifyNoInteractions(mailSender);
    }

    private JsonNode readJson(String json) throws Exception {
        return objectMapper.readTree(json);
    }

    private record RegisterPayload(
            String fullName,
            String email,
            String password,
            String role
    ) {}

    private record ForgotPayload(String email) {}
}
