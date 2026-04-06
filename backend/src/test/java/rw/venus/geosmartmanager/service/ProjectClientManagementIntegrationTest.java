package rw.venus.geosmartmanager.service;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;
import rw.venus.geosmartmanager.api.dto.ClientDtos;
import rw.venus.geosmartmanager.api.dto.ProjectDtos;
import rw.venus.geosmartmanager.api.dto.ProjectRecordsDtos;
import rw.venus.geosmartmanager.domain.KycStatus;
import rw.venus.geosmartmanager.domain.ProjectCommunicationChannel;
import rw.venus.geosmartmanager.domain.ProjectDocumentApprovalStatus;
import rw.venus.geosmartmanager.domain.ProjectStatus;
import rw.venus.geosmartmanager.entity.ClientEntity;
import rw.venus.geosmartmanager.entity.ProjectEntity;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
@Transactional
class ProjectClientManagementIntegrationTest {
    @Autowired
    private ClientService clientService;

    @Autowired
    private ProjectService projectService;

    @Autowired
    private ProjectDocumentService projectDocumentService;

    @Autowired
    private ProjectCommunicationService projectCommunicationService;

    @Test
    void clientKycProjectRecordsAndArchiveFlowWorkTogether() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);

        ClientEntity client = clientService.create(new ClientDtos.ClientRequest(
                "Client " + suffix,
                "client-" + suffix + "@example.com",
                "+250780123456",
                "Kigali, Gasabo",
                "NID-" + suffix,
                "LAND-" + suffix,
                KycStatus.VERIFIED,
                "Verified against submitted ownership documents"
        ));

        ProjectEntity project = projectService.create(new ProjectDtos.ProjectRequest(
                "PRJ-" + suffix,
                "Archive Flow " + suffix,
                "Land Subdivision",
                "Gasabo district test parcel",
                "Six-lot subdivision package",
                "Integration flow for client and project completeness",
                ProjectStatus.IN_PROGRESS,
                LocalDate.now(),
                LocalDate.now().plusDays(21),
                client.getId()
        ));

        var document = projectDocumentService.create(project.getId(), new ProjectRecordsDtos.ProjectDocumentRequest(
                "Subdivision Plan",
                "Plan Sheet",
                "v1",
                "docs/" + suffix + "/plan.pdf",
                ProjectDocumentApprovalStatus.REVIEW,
                "Pending manager sign-off"
        ));

        var communication = projectCommunicationService.create(project.getId(), new ProjectRecordsDtos.ProjectCommunicationRequest(
                ProjectCommunicationChannel.MEETING,
                "Client scope review",
                "Alice Mukamana",
                "Client approved the baseline parcel schedule.",
                Instant.now()
        ));

        assertThat(client.getIdDocumentReference()).isEqualTo("NID-" + suffix);
        assertThat(client.getLandOwnershipReference()).isEqualTo("LAND-" + suffix);
        assertThat(client.getKycStatus()).isEqualTo(KycStatus.VERIFIED);
        assertThat(project.getProjectType()).isEqualTo("Land Subdivision");
        assertThat(project.getLocationSummary()).contains("Gasabo");
        assertThat(project.getScopeSummary()).contains("Six-lot");
        assertThat(document.getProject().getId()).isEqualTo(project.getId());
        assertThat(communication.getProject().getId()).isEqualTo(project.getId());
        assertThat(projectService.documentCount(project.getId())).isEqualTo(1);
        assertThat(projectService.communicationCount(project.getId())).isEqualTo(1);
        assertThat(projectService.list(false)).extracting(ProjectEntity::getId).contains(project.getId());

        ProjectEntity archived = projectService.archive(project.getId());

        assertThat(archived.getArchivedAt()).isNotNull();
        assertThat(projectService.workflowSnapshot(project.getId()).stage()).isEqualTo("ARCHIVED");
        assertThat(projectService.list(false)).extracting(ProjectEntity::getId).doesNotContain(project.getId());
        assertThat(projectService.list(true)).extracting(ProjectEntity::getId).contains(project.getId());
        assertThatThrownBy(() -> projectDocumentService.create(project.getId(), new ProjectRecordsDtos.ProjectDocumentRequest(
                "Submission Letter",
                "Approval",
                "v2",
                null,
                ProjectDocumentApprovalStatus.DRAFT,
                null
        )))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("archived");

        ProjectEntity restored = projectService.restore(project.getId());

        assertThat(restored.getArchivedAt()).isNull();
        assertThat(projectService.list(false)).extracting(ProjectEntity::getId).contains(project.getId());
    }
}
