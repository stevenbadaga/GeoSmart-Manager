package rw.venus.geosmartmanager.service;

import rw.venus.geosmartmanager.api.dto.ReportDtos;
import rw.venus.geosmartmanager.domain.ReportType;
import rw.venus.geosmartmanager.entity.ProjectEntity;
import rw.venus.geosmartmanager.entity.ReportEntity;
import rw.venus.geosmartmanager.entity.SubdivisionRunEntity;
import rw.venus.geosmartmanager.entity.UserEntity;
import rw.venus.geosmartmanager.exception.ApiException;
import rw.venus.geosmartmanager.repo.ComplianceCheckRepository;
import rw.venus.geosmartmanager.repo.ProjectRepository;
import rw.venus.geosmartmanager.repo.ReportRepository;
import rw.venus.geosmartmanager.repo.SubdivisionRunRepository;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.util.Comparator;
import java.util.Optional;
import java.util.UUID;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

@Service
public class ReportService {
    private final ProjectRepository projectRepository;
    private final SubdivisionRunRepository subdivisionRunRepository;
    private final ComplianceCheckRepository complianceCheckRepository;
    private final ReportRepository reportRepository;
    private final StorageService storageService;
    private final AuditService auditService;

    public ReportService(
            ProjectRepository projectRepository,
            SubdivisionRunRepository subdivisionRunRepository,
            ComplianceCheckRepository complianceCheckRepository,
            ReportRepository reportRepository,
            StorageService storageService,
            AuditService auditService
    ) {
        this.projectRepository = projectRepository;
        this.subdivisionRunRepository = subdivisionRunRepository;
        this.complianceCheckRepository = complianceCheckRepository;
        this.reportRepository = reportRepository;
        this.storageService = storageService;
        this.auditService = auditService;
    }

    public ReportDtos.ReportDto generate(UserEntity actor, UUID projectId, ReportDtos.GenerateReportRequest req) {
        ProjectEntity project = projectRepository.findById(projectId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Project not found"));

        ReportEntity report = new ReportEntity();
        report.setProject(project);
        report.setType(req.type());
        report.setFilePath("PENDING");
        report = reportRepository.save(report);

        Path out = storageService.resolve("projects", projectId.toString(), "reports", report.getId() + ".pdf");
        storageService.ensureParentDir(out);

        try {
            String title = "GeoSmart-Manager Report";
            String subtitle = req.type().name();
            writePdf(out, title, subtitle, project, req);
        } catch (IOException ex) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "REPORT_ERROR", "Failed to generate PDF report");
        }

        report.setFilePath(storageService.getRoot().relativize(out).toString());
        report = reportRepository.save(report);

        auditService.log(actor, "REPORT_GENERATED", "Report", report.getId());
        return new ReportDtos.ReportDto(report.getId(), project.getId(), report.getType(), report.getCreatedAt());
    }

    public java.util.List<ReportDtos.ReportDto> list(UUID projectId) {
        return reportRepository.findByProjectIdOrderByCreatedAtDesc(projectId).stream()
                .map(r -> new ReportDtos.ReportDto(r.getId(), r.getProject().getId(), r.getType(), r.getCreatedAt()))
                .toList();
    }

    public ReportEntity require(UUID reportId) {
        return reportRepository.findById(reportId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Report not found"));
    }

    public Path resolvePath(ReportEntity report) {
        return storageService.getRoot().resolve(report.getFilePath()).normalize();
    }

    private void writePdf(Path out, String title, String subtitle, ProjectEntity project, ReportDtos.GenerateReportRequest req)
            throws IOException {
        try (PDDocument doc = new PDDocument()) {
            PDPage page = new PDPage(PDRectangle.A4);
            doc.addPage(page);

            try (PDPageContentStream cs = new PDPageContentStream(doc, page)) {
                cs.beginText();
                cs.setFont(PDType1Font.HELVETICA_BOLD, 18);
                cs.newLineAtOffset(50, 770);
                cs.showText(title);
                cs.endText();

                cs.beginText();
                cs.setFont(PDType1Font.HELVETICA, 12);
                cs.newLineAtOffset(50, 745);
                cs.showText("Type: " + subtitle);
                cs.endText();

                int y = 715;
                y = line(cs, y, "Project: " + project.getName());
                y = line(cs, y, "Client: " + project.getClient().getName());
                y = line(cs, y, "Generated at: " + Instant.now());

                if (req.type() == ReportType.SUBDIVISION_SUMMARY) {
                    Optional<SubdivisionRunEntity> runOpt = req.subdivisionRunId() == null
                            ? subdivisionRunRepository.findByProjectIdOrderByStartedAtDesc(project.getId()).stream().findFirst()
                            : subdivisionRunRepository.findById(req.subdivisionRunId());
                    if (runOpt.isPresent()) {
                        SubdivisionRunEntity run = runOpt.get();
                        y = line(cs, y - 10, "Subdivision run: " + run.getId());
                        y = line(cs, y, "Target parcels: " + run.getTargetParcels());
                        y = line(cs, y, "Min parcel area (sqm): " + run.getMinParcelArea());
                        y = line(cs, y, "Status: " + run.getStatus());
                    } else {
                        y = line(cs, y - 10, "Subdivision run: not found");
                    }
                }

                if (req.type() == ReportType.COMPLIANCE_SUMMARY) {
                    var latest = complianceCheckRepository.findByProjectIdOrderByCheckedAtDesc(project.getId()).stream()
                            .max(Comparator.comparing(c -> c.getCheckedAt() == null ? Instant.EPOCH : c.getCheckedAt()));
                    if (latest.isPresent()) {
                        var c = latest.get();
                        y = line(cs, y - 10, "Latest compliance: " + c.getStatus());
                        y = line(cs, y, "Checked at: " + c.getCheckedAt());
                    } else {
                        y = line(cs, y - 10, "No compliance checks yet");
                    }
                }
            }

            Files.createDirectories(out.getParent());
            doc.save(out.toFile());
        }
    }

    private int line(PDPageContentStream cs, int y, String text) throws IOException {
        cs.beginText();
        cs.setFont(PDType1Font.HELVETICA, 11);
        cs.newLineAtOffset(50, y);
        cs.showText(text);
        cs.endText();
        return y - 18;
    }
}

