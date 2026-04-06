package rw.venus.geosmartmanager.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import rw.venus.geosmartmanager.api.dto.ClientDtos;
import rw.venus.geosmartmanager.api.dto.ComplianceDtos;
import rw.venus.geosmartmanager.api.dto.DatasetDtos;
import rw.venus.geosmartmanager.api.dto.ProjectDtos;
import rw.venus.geosmartmanager.api.dto.ReportDtos;
import rw.venus.geosmartmanager.api.dto.SubdivisionDtos;
import rw.venus.geosmartmanager.api.dto.WorkflowDtos;
import rw.venus.geosmartmanager.domain.DatasetType;
import rw.venus.geosmartmanager.domain.KycStatus;
import rw.venus.geosmartmanager.domain.ProjectStatus;
import rw.venus.geosmartmanager.domain.ReportType;
import rw.venus.geosmartmanager.domain.SubdivisionOptimizationMode;
import rw.venus.geosmartmanager.entity.ClientEntity;
import rw.venus.geosmartmanager.entity.DatasetEntity;
import rw.venus.geosmartmanager.entity.ProjectEntity;
import rw.venus.geosmartmanager.entity.SubdivisionRunEntity;
import rw.venus.geosmartmanager.repo.ClientRepository;

import java.time.LocalDate;

@Component
public class SampleDataSeeder implements CommandLineRunner {
    private static final Logger log = LoggerFactory.getLogger(SampleDataSeeder.class);

    private final ClientRepository clientRepository;
    private final ClientService clientService;
    private final ProjectService projectService;
    private final DatasetService datasetService;
    private final SubdivisionService subdivisionService;
    private final ComplianceService complianceService;
    private final WorkflowTaskService workflowTaskService;
    private final ReportService reportService;

    public SampleDataSeeder(ClientRepository clientRepository,
                            ClientService clientService,
                            ProjectService projectService,
                            DatasetService datasetService,
                            SubdivisionService subdivisionService,
                            ComplianceService complianceService,
                            WorkflowTaskService workflowTaskService,
                            ReportService reportService) {
        this.clientRepository = clientRepository;
        this.clientService = clientService;
        this.projectService = projectService;
        this.datasetService = datasetService;
        this.subdivisionService = subdivisionService;
        this.complianceService = complianceService;
        this.workflowTaskService = workflowTaskService;
        this.reportService = reportService;
    }

    @Override
    public void run(String... args) {
        if (clientRepository.count() > 0) {
            log.info("Sample data seeding skipped: existing clients detected.");
            return;
        }

        try {
            ClientEntity client1 = clientService.create(new ClientDtos.ClientRequest(
                    "Umutekano Cooperative",
                    "contact@umutekano.rw",
                    "+250780123456",
                    "Kigali, Gasabo",
                    "NID-UMU-001",
                    "LAND-UMU-001",
                    KycStatus.VERIFIED,
                    "Core cooperative documents verified"
            ));

            ClientEntity client2 = clientService.create(new ClientDtos.ClientRequest(
                    "Nyumba Developers",
                    "projects@nyumba.rw",
                    "+250785445566",
                    "Kigali, Kicukiro",
                    "NID-NYU-002",
                    "LAND-NYU-002",
                    KycStatus.PENDING,
                    "Awaiting land title cross-check"
            ));

            ProjectEntity project1 = projectService.create(new ProjectDtos.ProjectRequest(
                    "GS-001",
                    "Kigali Parcel Subdivision",
                    "Land Subdivision",
                    "Gasabo District, Kigali",
                    "Subdivision planning for residential parcels",
                    "Subdivision planning for residential parcels",
                    ProjectStatus.IN_PROGRESS,
                    LocalDate.now().minusDays(14),
                    LocalDate.now().plusDays(30),
                    client1.getId()
            ));

            ProjectEntity project2 = projectService.create(new ProjectDtos.ProjectRequest(
                    "GS-002",
                    "Urban Expansion Survey",
                    "Survey",
                    "Kicukiro District, Kigali",
                    "Boundary and UPI validation",
                    "Boundary and UPI validation",
                    ProjectStatus.PLANNING,
                    LocalDate.now().minusDays(3),
                    null,
                    client2.getId()
            ));

            String sampleGeoJson = "{" +
                    "\"type\":\"FeatureCollection\"," +
                    "\"features\":[{" +
                    "\"type\":\"Feature\"," +
                    "\"properties\":{\"upi\":\"RW-UPI-0001\"}," +
                    "\"geometry\":{\"type\":\"Polygon\",\"coordinates\":[[[30.040,-1.970],[30.040,-1.940],[30.080,-1.940],[30.080,-1.970],[30.040,-1.970]]] }" +
                    "}]}";

            DatasetEntity dataset1 = datasetService.create(project1.getId(), new DatasetDtos.DatasetRequest(
                    "Kigali North Block",
                    DatasetType.CADASTRAL,
                    sampleGeoJson
            ));

            datasetService.create(project1.getId(), new DatasetDtos.DatasetRequest(
                    "Kigali Master Plan",
                    DatasetType.MASTER_PLAN,
                    sampleGeoJson
            ));

            datasetService.create(project2.getId(), new DatasetDtos.DatasetRequest(
                    "Kigali Urban Boundary",
                    DatasetType.BOUNDARY,
                    sampleGeoJson
            ));

            SubdivisionRunEntity run = subdivisionService.runSubdivision(project1.getId(),
                    new SubdivisionDtos.RunSubdivisionRequest(dataset1.getId(), 6, SubdivisionOptimizationMode.BALANCED));

            complianceService.runCompliance(project1.getId(), new ComplianceDtos.RunComplianceRequest(run.getId()));

            workflowTaskService.create(project1.getId(), new WorkflowDtos.WorkflowTaskRequest(
                    "Field verification",
                    "Validate parcel beacons on-site",
                    "engineer@venus.rw",
                    LocalDate.now().plusDays(7)
            ));

            workflowTaskService.create(project1.getId(), new WorkflowDtos.WorkflowTaskRequest(
                    "Client approval",
                    "Share subdivision layout for approval",
                    "client@umutekano.rw",
                    LocalDate.now().plusDays(14)
            ));

            reportService.generate(project1.getId(), new ReportDtos.GenerateReportRequest(ReportType.PROJECT_SUMMARY));
            reportService.generate(project1.getId(), new ReportDtos.GenerateReportRequest(ReportType.SURVEY));
            reportService.generate(project1.getId(), new ReportDtos.GenerateReportRequest(ReportType.COMPLIANCE));

            log.info("Sample data seeded successfully.");
        } catch (Exception ex) {
            log.warn("Sample data seeding failed: {}", ex.getMessage());
        }
    }
}
