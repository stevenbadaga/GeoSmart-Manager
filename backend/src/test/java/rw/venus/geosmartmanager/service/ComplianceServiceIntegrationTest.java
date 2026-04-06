package rw.venus.geosmartmanager.service;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;
import rw.venus.geosmartmanager.api.dto.ClientDtos;
import rw.venus.geosmartmanager.api.dto.ComplianceDtos;
import rw.venus.geosmartmanager.api.dto.DatasetDtos;
import rw.venus.geosmartmanager.api.dto.ProjectDtos;
import rw.venus.geosmartmanager.api.dto.SubdivisionDtos;
import rw.venus.geosmartmanager.config.AppProperties;
import rw.venus.geosmartmanager.domain.DatasetType;
import rw.venus.geosmartmanager.domain.KycStatus;
import rw.venus.geosmartmanager.domain.ProjectStatus;
import rw.venus.geosmartmanager.domain.SubdivisionOptimizationMode;
import rw.venus.geosmartmanager.entity.ComplianceCheckEntity;
import rw.venus.geosmartmanager.entity.DatasetEntity;
import rw.venus.geosmartmanager.entity.ProjectEntity;
import rw.venus.geosmartmanager.entity.SubdivisionRunEntity;
import rw.venus.geosmartmanager.repo.ComplianceCheckRepository;

import java.time.LocalDate;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@Transactional
class ComplianceServiceIntegrationTest {
    private static final String SAMPLE_GEO_JSON = """
            {
              "type": "FeatureCollection",
              "features": [
                {
                  "type": "Feature",
                  "properties": { "upi": "RW-UPI-TEST-0001" },
                  "geometry": {
                    "type": "Polygon",
                    "coordinates": [[[30.040,-1.970],[30.040,-1.940],[30.080,-1.940],[30.080,-1.970],[30.040,-1.970]]]
                  }
                }
              ]
            }
            """;

    @Autowired
    private ClientService clientService;

    @Autowired
    private ProjectService projectService;

    @Autowired
    private DatasetService datasetService;

    @Autowired
    private SubdivisionService subdivisionService;

    @Autowired
    private ComplianceService complianceService;

    @Autowired
    private ComplianceCheckRepository complianceCheckRepository;

    @Autowired
    private AppProperties appProperties;

    @Test
    void complianceWorkflowReturnsRuleDetailsAndArtifacts() {
        ProjectEntity project = createProject();
        DatasetEntity cadastral = datasetService.create(project.getId(), new DatasetDtos.DatasetRequest(
                "Compliance Test Cadastral",
                DatasetType.CADASTRAL,
                SAMPLE_GEO_JSON
        ));
        datasetService.create(project.getId(), new DatasetDtos.DatasetRequest(
                "Compliance Test Master Plan",
                DatasetType.MASTER_PLAN,
                SAMPLE_GEO_JSON
        ));

        SubdivisionRunEntity run = subdivisionService.runSubdivision(project.getId(), new SubdivisionDtos.RunSubdivisionRequest(
                cadastral.getId(),
                6,
                SubdivisionOptimizationMode.BALANCED
        ));
        ComplianceCheckEntity check = complianceService.runCompliance(project.getId(), new ComplianceDtos.RunComplianceRequest(run.getId()));

        ComplianceDtos.ComplianceResponse response = complianceService.toResponse(check);
        ComplianceDtos.SubmissionPackageResponse submissionPackage = complianceService.buildSubmissionPackage(project.getId(), check.getId());
        ComplianceDtos.CertificateTemplateResponse certificateTemplate = complianceService.buildCertificateTemplate(project.getId(), check.getId());

        assertThat(response.frameworkVersion()).isEqualTo(appProperties.getCompliance().getFrameworkVersion());
        assertThat(response.checkedAt()).isNotBlank();
        assertThat(response.ruleResults()).isNotEmpty();
        assertThat(response.ruleResults()).anyMatch(rule -> "GEOMETRY_COMPLETENESS".equals(rule.ruleCode()));

        assertThat(submissionPackage.complianceCheckId()).isEqualTo(check.getId());
        assertThat(submissionPackage.frameworkVersion()).isEqualTo(appProperties.getCompliance().getFrameworkVersion());
        assertThat(submissionPackage.ruleResults()).isNotEmpty();
        assertThat(submissionPackage.requiredAttachments()).isNotEmpty();

        assertThat(certificateTemplate.complianceCheckId()).isEqualTo(check.getId());
        assertThat(certificateTemplate.frameworkVersion()).isEqualTo(appProperties.getCompliance().getFrameworkVersion());
        assertThat(certificateTemplate.signatories()).hasSize(3);
        assertThat(certificateTemplate.statement()).isNotBlank();
    }

    @Test
    void liveCheckReusesRecentComplianceResultWithinTtl() {
        ProjectEntity project = createProject();
        DatasetEntity cadastral = datasetService.create(project.getId(), new DatasetDtos.DatasetRequest(
                "Live Check Cadastral",
                DatasetType.CADASTRAL,
                SAMPLE_GEO_JSON
        ));
        datasetService.create(project.getId(), new DatasetDtos.DatasetRequest(
                "Live Check Master Plan",
                DatasetType.MASTER_PLAN,
                SAMPLE_GEO_JSON
        ));

        SubdivisionRunEntity run = subdivisionService.runSubdivision(project.getId(), new SubdivisionDtos.RunSubdivisionRequest(
                cadastral.getId(),
                4,
                SubdivisionOptimizationMode.BALANCED
        ));
        ComplianceCheckEntity initialCheck = complianceService.runCompliance(project.getId(), new ComplianceDtos.RunComplianceRequest(run.getId()));

        long initialCount = complianceCheckRepository.countByProjectId(project.getId());
        ComplianceDtos.ComplianceResponse liveResponse = complianceService.liveCheck(project.getId(), run.getId(), 600L);

        assertThat(liveResponse.id()).isEqualTo(initialCheck.getId());
        assertThat(complianceCheckRepository.countByProjectId(project.getId())).isEqualTo(initialCount);
    }

    private ProjectEntity createProject() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        var client = clientService.create(new ClientDtos.ClientRequest(
                "Compliance Client " + suffix,
                "client-" + suffix + "@example.com",
                "+250780000000",
                "Kigali",
                "NID-" + suffix,
                "LAND-" + suffix,
                KycStatus.VERIFIED,
                "Compliance onboarding validated"
        ));
        return projectService.create(new ProjectDtos.ProjectRequest(
                "CMP-" + suffix,
                "Compliance Project " + suffix,
                "Land Subdivision",
                "Kigali test sector",
                "Integration test project",
                "Integration test project",
                ProjectStatus.IN_PROGRESS,
                LocalDate.now(),
                LocalDate.now().plusDays(14),
                client.getId()
        ));
    }
}
