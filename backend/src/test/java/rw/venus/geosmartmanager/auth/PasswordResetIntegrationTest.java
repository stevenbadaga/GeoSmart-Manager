package rw.venus.geosmartmanager.auth;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.mail.BodyPart;
import jakarta.mail.Multipart;
import jakarta.mail.Session;
import jakarta.mail.internet.MimeMessage;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.mail.MailAuthenticationException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;
import rw.venus.geosmartmanager.entity.UserEntity;
import rw.venus.geosmartmanager.repo.PasswordResetTokenRepository;
import rw.venus.geosmartmanager.repo.UserRepository;

import java.util.Properties;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.reset;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = {
        "app.mail.from-address=test@geomart.rw",
        "app.auth.password-reset-url-base=http://localhost:5173/reset-password"
})
@AutoConfigureMockMvc
@Transactional
class PasswordResetIntegrationTest {
    private static final Pattern TOKEN_PATTERN = Pattern.compile("token(?:=|=3D)([A-Za-z0-9_-]+)");

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

    @BeforeEach
    void setUp() {
        reset(mailSender);
        when(mailSender.createMimeMessage())
                .thenAnswer(invocation -> new MimeMessage(Session.getInstance(new Properties())));
    }

    @Test
    void forgotPasswordResetFlowUpdatesPasswordAndRevokesExistingSessions() throws Exception {
        String email = "reset-" + UUID.randomUUID().toString().substring(0, 8) + "@example.com";
        String oldPassword = "Password123!";
        String newPassword = "NewPassword456!";

        JsonNode registerNode = readJson(mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new RegisterPayload(
                                "Reset Engineer",
                                email,
                                oldPassword,
                                "ENGINEER"
                        ))))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString());
        String sessionToken = registerNode.path("token").asText();

        mockMvc.perform(post("/api/auth/password/forgot")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new ForgotPayload(email))))
                .andExpect(status().isOk());

        ArgumentCaptor<MimeMessage> messageCaptor = ArgumentCaptor.forClass(MimeMessage.class);
        verify(mailSender).send(messageCaptor.capture());
        String resetToken = extractResetToken(messageCaptor.getValue());

        JsonNode validateNode = readJson(mockMvc.perform(get("/api/auth/password/reset/validate")
                        .param("token", resetToken))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString());
        assertThat(validateNode.path("valid").asBoolean()).isTrue();

        mockMvc.perform(post("/api/auth/password/reset")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new ResetPayload(
                                resetToken,
                                newPassword,
                                newPassword
                        ))))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/users/me")
                        .header("Authorization", "Bearer " + sessionToken))
                .andExpect(status().is4xxClientError());

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new LoginPayload(email, oldPassword))))
                .andExpect(status().is4xxClientError());

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new LoginPayload(email, newPassword))))
                .andExpect(status().isOk());
    }

    @Test
    void forgotPasswordDoesNotLeaveActiveTokenWhenEmailDeliveryFails() throws Exception {
        String email = "reset-fail-" + UUID.randomUUID().toString().substring(0, 8) + "@example.com";

        readJson(mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new RegisterPayload(
                                "Reset Failure",
                                email,
                                "Password123!",
                                "ENGINEER"
                        ))))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString());

        doThrow(new MailAuthenticationException("bad smtp credentials"))
                .when(mailSender)
                .send(any(MimeMessage.class));

        mockMvc.perform(post("/api/auth/password/forgot")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new ForgotPayload(email))))
                .andExpect(status().isServiceUnavailable());

        UserEntity user = userRepository.findByEmailIgnoreCase(email).orElseThrow();
        assertThat(passwordResetTokenRepository.findByUserIdAndUsedAtIsNull(user.getId())).isEmpty();
    }

    private String extractResetToken(MimeMessage message) throws Exception {
        String html = readMessageBody(message);
        Matcher matcher = TOKEN_PATTERN.matcher(html);
        assertThat(matcher.find()).isTrue();
        return matcher.group(1);
    }

    private String readMessageBody(MimeMessage message) throws Exception {
        return readContent(message.getContent());
    }

    private String readContent(Object content) throws Exception {
        if (content instanceof String stringContent) {
            return stringContent;
        }
        if (content instanceof Multipart multipart) {
            StringBuilder body = new StringBuilder();
            for (int index = 0; index < multipart.getCount(); index++) {
                BodyPart bodyPart = multipart.getBodyPart(index);
                body.append(readContent(bodyPart.getContent()));
                body.append('\n');
            }
            return body.toString();
        }
        return String.valueOf(content);
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

    private record ResetPayload(
            String token,
            String newPassword,
            String confirmPassword
    ) {}

    private record LoginPayload(
            String email,
            String password
    ) {}
}
