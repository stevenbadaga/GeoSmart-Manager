package rw.venus.geosmartmanager.project;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;
import rw.venus.geosmartmanager.domain.KycStatus;
import rw.venus.geosmartmanager.domain.ProjectStatus;
import rw.venus.geosmartmanager.domain.Role;
import rw.venus.geosmartmanager.domain.UserStatus;
import rw.venus.geosmartmanager.entity.ClientEntity;
import rw.venus.geosmartmanager.entity.ProjectEntity;
import rw.venus.geosmartmanager.entity.UserEntity;
import rw.venus.geosmartmanager.repo.ClientRepository;
import rw.venus.geosmartmanager.repo.ProjectRepository;
import rw.venus.geosmartmanager.repo.UserRepository;

import java.time.Instant;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class ProjectOwnershipAssignmentIntegrationTest {
    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ClientRepository clientRepository;

    @Autowired
    private ProjectRepository projectRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Test
    void clientCanCreateOwnProjectAndOnlySeeOwnedProjects() throws Exception {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        String clientEmail = "client-" + suffix + "@example.com";
        String clientPassword = "Password123!";

        JsonNode clientAuth = register("Client " + suffix, clientEmail, clientPassword, "CLIENT");
        Long clientUserId = clientAuth.path("user").path("id").asLong();

        ClientEntity linkedClient = clientRepository.findByUserId(clientUserId).orElseThrow();
        assertThat(linkedClient.getName()).isEqualTo("Client " + suffix);
        assertThat(linkedClient.getContactEmail()).isEqualTo(clientEmail);

        String clientToken = clientAuth.path("token").asText();

        JsonNode createdProject = readJson(mockMvc.perform(post("/api/projects")
                        .header("Authorization", "Bearer " + clientToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new ProjectPayload(
                                "GS-" + suffix,
                                "Client Case " + suffix,
                                "Land Subdivision",
                                "Gasabo, Kigali",
                                "Six plot concept",
                                "Client-submitted planning dossier",
                                null,
                                null,
                                null,
                                null,
                                "1/01/05/04/" + suffix.substring(0, 4),
                                6,
                                "Agriculture",
                                "Client is requesting an agricultural subdivision."
                        ))))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString());

        assertThat(createdProject.path("status").asText()).isEqualTo(ProjectStatus.SUBMITTED.name());
        assertThat(createdProject.path("clientId").asLong()).isEqualTo(linkedClient.getId());

        JsonNode ownProjects = readJson(mockMvc.perform(get("/api/projects?includeArchived=true")
                        .header("Authorization", "Bearer " + clientToken))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString());

        assertThat(ownProjects.isArray()).isTrue();
        assertThat(ownProjects.size()).isEqualTo(1);
        assertThat(ownProjects.get(0).path("name").asText()).isEqualTo("Client Case " + suffix);

        JsonNode secondClientAuth = register("Other Client " + suffix, "other-" + suffix + "@example.com", clientPassword, "CLIENT");
        String secondClientToken = secondClientAuth.path("token").asText();

        JsonNode otherProjects = readJson(mockMvc.perform(get("/api/projects?includeArchived=true")
                        .header("Authorization", "Bearer " + secondClientToken))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString());

        assertThat(otherProjects.isArray()).isTrue();
        assertThat(otherProjects.size()).isZero();
    }

    @Test
    void adminCanAssignProjectToSurveyorAndSurveyorOnlySeesAssignedProjects() throws Exception {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        String adminPassword = "Admin123!";
        String surveyorPassword = "Survey123!";

        UserEntity admin = createUser("Admin " + suffix, "admin-" + suffix + "@example.com", adminPassword, Role.ADMIN);
        UserEntity surveyor = createUser("Surveyor " + suffix, "surveyor-" + suffix + "@example.com", surveyorPassword, Role.SURVEYOR);
        ClientEntity client = clientRepository.save(ClientEntity.builder()
                .name("Assigned Client " + suffix)
                .contactEmail("assigned-client-" + suffix + "@example.com")
                .kycStatus(KycStatus.VERIFIED)
                .createdAt(Instant.now())
                .build());
        ProjectEntity project = projectRepository.save(ProjectEntity.builder()
                .code("ASSIGN-" + suffix)
                .name("Assignment Case " + suffix)
                .projectType("Land Subdivision")
                .locationSummary("Nyarugenge")
                .scopeSummary("Survey package")
                .description("Assignment verification flow")
                .status(ProjectStatus.SUBMITTED)
                .client(client)
                .createdAt(Instant.now())
                .build());

        String adminToken = login(admin.getEmail(), adminPassword).path("token").asText();

        JsonNode assignedProject = readJson(mockMvc.perform(post("/api/projects/" + project.getId() + "/assign")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new AssignmentPayload(surveyor.getId()))))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString());

        assertThat(assignedProject.path("assignedSurveyorId").asLong()).isEqualTo(surveyor.getId());
        assertThat(assignedProject.path("assignedSurveyorName").asText()).isEqualTo(surveyor.getFullName());
        assertThat(assignedProject.path("status").asText()).isEqualTo(ProjectStatus.ASSIGNED.name());

        String surveyorToken = login(surveyor.getEmail(), surveyorPassword).path("token").asText();
        JsonNode surveyorProjects = readJson(mockMvc.perform(get("/api/projects?includeArchived=true")
                        .header("Authorization", "Bearer " + surveyorToken))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString());

        assertThat(surveyorProjects.isArray()).isTrue();
        assertThat(surveyorProjects.size()).isEqualTo(1);
        assertThat(surveyorProjects.get(0).path("id").asLong()).isEqualTo(project.getId());
    }

    private JsonNode register(String fullName, String email, String password, String role) throws Exception {
        return readJson(mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new RegisterPayload(fullName, email, password, role))))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString());
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

    private UserEntity createUser(String fullName, String email, String password, Role role) {
        Instant now = Instant.now();
        return userRepository.save(UserEntity.builder()
                .fullName(fullName)
                .email(email)
                .passwordHash(passwordEncoder.encode(password))
                .role(role)
                .status(UserStatus.ACTIVE)
                .createdAt(now)
                .lastActiveAt(now)
                .build());
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

    private record LoginPayload(
            String email,
            String password
    ) {}

    private record ProjectPayload(
            String code,
            String name,
            String projectType,
            String locationSummary,
            String scopeSummary,
            String description,
            String status,
            String startDate,
            String endDate,
            Long clientId,
            String requestedUpi,
            Integer requestedParcelCount,
            String requestedLandUse,
            String intakeNotes
    ) {}

    private record AssignmentPayload(Long surveyorId) {}
}
