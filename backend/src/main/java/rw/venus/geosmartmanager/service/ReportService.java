package rw.venus.geosmartmanager.service;

import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.springframework.stereotype.Service;
import rw.venus.geosmartmanager.api.dto.ReportDtos;
import rw.venus.geosmartmanager.entity.ProjectEntity;
import rw.venus.geosmartmanager.entity.ReportEntity;
import rw.venus.geosmartmanager.entity.SubdivisionRunEntity;
import rw.venus.geosmartmanager.entity.ComplianceCheckEntity;
import rw.venus.geosmartmanager.entity.DatasetEntity;
import rw.venus.geosmartmanager.repo.ComplianceCheckRepository;
import rw.venus.geosmartmanager.repo.DatasetRepository;
import rw.venus.geosmartmanager.repo.ProjectRepository;
import rw.venus.geosmartmanager.repo.ReportRepository;
import rw.venus.geosmartmanager.repo.SubdivisionRunRepository;

import java.io.ByteArrayOutputStream;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

@Service
public class ReportService {
    private static final float MARGIN = 50f;
    private static final float FONT_SIZE = 11f;
    private static final float TITLE_SIZE = 16f;
    private static final float LEADING = 14f;

    private final ReportRepository reportRepository;
    private final ProjectRepository projectRepository;
    private final DatasetRepository datasetRepository;
    private final SubdivisionRunRepository subdivisionRunRepository;
    private final ComplianceCheckRepository complianceCheckRepository;
    private final AuditService auditService;
    private final CurrentUserService currentUserService;

    public ReportService(ReportRepository reportRepository,
                         ProjectRepository projectRepository,
                         DatasetRepository datasetRepository,
                         SubdivisionRunRepository subdivisionRunRepository,
                         ComplianceCheckRepository complianceCheckRepository,
                         AuditService auditService,
                         CurrentUserService currentUserService) {
        this.reportRepository = reportRepository;
        this.projectRepository = projectRepository;
        this.datasetRepository = datasetRepository;
        this.subdivisionRunRepository = subdivisionRunRepository;
        this.complianceCheckRepository = complianceCheckRepository;
        this.auditService = auditService;
        this.currentUserService = currentUserService;
    }

    public ReportEntity generate(Long projectId, ReportDtos.GenerateReportRequest request) {
        ProjectEntity project = projectRepository.findById(projectId)
                .orElseThrow(() -> new IllegalArgumentException("Project not found"));

        String content = buildReportContent(project, request.type());

        ReportEntity report = ReportEntity.builder()
                .project(project)
                .type(request.type())
                .content(content)
                .createdAt(Instant.now())
                .build();
        reportRepository.save(report);
        auditService.log(currentUserService.getCurrentUserEmail(), "GENERATE", "Report", report.getId(), "Report generated");
        return report;
    }

    public List<ReportEntity> listByProject(Long projectId) {
        return reportRepository.findByProjectId(projectId);
    }

    public ReportEntity getReport(Long projectId, Long reportId) {
        return reportRepository.findByIdAndProjectId(reportId, projectId)
                .orElseThrow(() -> new IllegalArgumentException("Report not found"));
    }

    public byte[] generatePdf(ReportEntity report) {
        try (PDDocument document = new PDDocument()) {
            PDPage page = new PDPage(PDRectangle.A4);
            document.addPage(page);

            float y = page.getMediaBox().getHeight() - MARGIN;
            PDPageContentStream content = new PDPageContentStream(document, page);

            List<Line> lines = buildPdfLines(report);
            float x = MARGIN;

            boolean started = false;
            for (Line line : lines) {
                if (!started) {
                    content.beginText();
                    content.newLineAtOffset(x, y);
                    started = true;
                }

                if (y <= MARGIN) {
                    content.endText();
                    content.close();
                    page = new PDPage(PDRectangle.A4);
                    document.addPage(page);
                    y = page.getMediaBox().getHeight() - MARGIN;
                    content = new PDPageContentStream(document, page);
                    content.beginText();
                    content.newLineAtOffset(x, y);
                }

                content.setFont(line.bold ? PDType1Font.HELVETICA_BOLD : PDType1Font.HELVETICA,
                        line.bold ? TITLE_SIZE : FONT_SIZE);
                content.showText(line.text);
                content.newLineAtOffset(0, -LEADING);
                y -= LEADING;
            }

            if (started) {
                content.endText();
            }
            content.close();

            ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
            document.save(outputStream);
            return outputStream.toByteArray();
        } catch (Exception ex) {
            throw new IllegalStateException("Failed to generate PDF report");
        }
    }

    private String buildReportContent(ProjectEntity project, rw.venus.geosmartmanager.domain.ReportType type) {
        List<DatasetEntity> datasets = datasetRepository.findByProjectId(project.getId());
        List<SubdivisionRunEntity> runs = subdivisionRunRepository.findByProjectId(project.getId());
        List<ComplianceCheckEntity> checks = complianceCheckRepository.findByProjectId(project.getId());

        switch (type) {
            case SUBDIVISION -> {
                SubdivisionRunEntity latest = runs.stream()
                        .max(java.util.Comparator.comparing(SubdivisionRunEntity::getCreatedAt))
                        .orElse(null);
                if (latest == null) {
                    return "Subdivision Report\nProject: " + project.getName() + " (" + project.getCode() + ")\n" +
                            "No subdivision runs recorded.";
                }
                return "Subdivision Report\nProject: " + project.getName() + " (" + project.getCode() + ")\n" +
                        "Dataset: " + latest.getDataset().getName() + "\n" +
                        "Parcels: " + latest.getParcelCount() + "\n" +
                        "Average Area: " + String.format("%.2f sqm", latest.getAvgParcelAreaSqm()) + "\n" +
                        "Optimization: " + latest.getOptimizationMode() + "\n" +
                        "Quality Score: " + String.format("%.1f", latest.getQualityScore()) + "\n" +
                        "Status: " + latest.getStatus();
            }
            case COMPLIANCE -> {
                ComplianceCheckEntity latest = checks.stream()
                        .max(java.util.Comparator.comparing(ComplianceCheckEntity::getCheckedAt))
                        .orElse(null);
                if (latest == null) {
                    return "Compliance Report\nProject: " + project.getName() + " (" + project.getCode() + ")\n" +
                            "No compliance checks recorded.";
                }
                return "Compliance Report\nProject: " + project.getName() + " (" + project.getCode() + ")\n" +
                        "Subdivision Run ID: " + latest.getSubdivisionRun().getId() + "\n" +
                        "Status: " + latest.getStatus() + "\n" +
                        "Findings: " + latest.getFindings();
            }
            case SURVEY -> {
                java.util.Map<String, Long> typeCounts = datasets.stream()
                        .collect(java.util.stream.Collectors.groupingBy(d -> d.getType().name(), java.util.stream.Collectors.counting()));
                StringBuilder builder = new StringBuilder();
                builder.append("Survey Report\n");
                builder.append("Project: ").append(project.getName()).append(" (").append(project.getCode()).append(")\n");
                builder.append("Datasets: ").append(datasets.size()).append("\n");
                if (!typeCounts.isEmpty()) {
                    builder.append("Dataset Types:\n");
                    typeCounts.forEach((key, value) -> builder.append("- ").append(key).append(": ").append(value).append("\n"));
                }
                if (!datasets.isEmpty()) {
                    builder.append("Dataset List:\n");
                    for (DatasetEntity dataset : datasets) {
                        builder.append("- ").append(dataset.getName()).append(" [").append(dataset.getType()).append("]\n");
                    }
                }
                return builder.toString().trim();
            }
            case PROJECT_SUMMARY -> {
                return "Project Summary\nProject: " + project.getName() + " (" + project.getCode() + ")\n" +
                        "Datasets: " + datasets.size() + "\n" +
                        "Subdivision Runs: " + runs.size() + "\n" +
                        "Compliance Checks: " + checks.size() + "\n" +
                        "Status: " + project.getStatus();
            }
            default -> {
                return "Project Summary\nProject: " + project.getName() + " (" + project.getCode() + ")\n" +
                        "Datasets: " + datasets.size() + "\n" +
                        "Subdivision Runs: " + runs.size() + "\n" +
                        "Compliance Checks: " + checks.size() + "\n" +
                        "Status: " + project.getStatus();
            }
        }
    }

    private List<Line> buildPdfLines(ReportEntity report) {
        List<Line> lines = new ArrayList<>();
        ProjectEntity project = report.getProject();

        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm").withZone(ZoneId.of("Africa/Kigali"));
        String created = formatter.format(report.getCreatedAt());

        lines.add(new Line("GeoSmart-Manager Report", true));
        lines.add(new Line("Project: " + project.getName() + " (" + project.getCode() + ")", false));
        lines.add(new Line("Report Type: " + report.getType(), false));
        lines.add(new Line("Generated: " + created + " CAT", false));
        lines.add(new Line("", false));

        String content = report.getContent() == null ? "" : report.getContent();
        for (String rawLine : content.split("\\r?\\n")) {
            lines.addAll(wrapLine(rawLine, 95));
        }

        if (lines.isEmpty()) {
            lines.add(new Line("No report content available.", false));
        }
        return lines;
    }

    private List<Line> wrapLine(String text, int maxChars) {
        List<Line> lines = new ArrayList<>();
        if (text == null) {
            lines.add(new Line("", false));
            return lines;
        }

        String remaining = text.trim();
        if (remaining.isEmpty()) {
            lines.add(new Line("", false));
            return lines;
        }

        while (remaining.length() > maxChars) {
            int split = remaining.lastIndexOf(' ', maxChars);
            if (split <= 0) {
                split = maxChars;
            }
            String part = remaining.substring(0, split).trim();
            lines.add(new Line(part, false));
            remaining = remaining.substring(split).trim();
        }

        if (!remaining.isEmpty()) {
            lines.add(new Line(remaining, false));
        }
        return lines;
    }

    private record Line(String text, boolean bold) {}
}
