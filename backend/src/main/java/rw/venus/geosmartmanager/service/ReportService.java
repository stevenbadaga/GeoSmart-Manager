package rw.venus.geosmartmanager.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.awt.Color;
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
import org.springframework.transaction.annotation.Transactional;
import rw.venus.geosmartmanager.api.dto.ReportDtos;
import rw.venus.geosmartmanager.domain.ReportType;
import rw.venus.geosmartmanager.domain.RunStatus;
import rw.venus.geosmartmanager.entity.ProjectEntity;
import rw.venus.geosmartmanager.entity.ReportEntity;
import rw.venus.geosmartmanager.entity.SubdivisionRunEntity;
import rw.venus.geosmartmanager.entity.UserEntity;
import rw.venus.geosmartmanager.exception.ApiException;
import rw.venus.geosmartmanager.repo.ComplianceCheckRepository;
import rw.venus.geosmartmanager.repo.ProjectRepository;
import rw.venus.geosmartmanager.repo.ReportRepository;
import rw.venus.geosmartmanager.repo.SubdivisionRunRepository;

@Service
public class ReportService {
    private final ProjectRepository projectRepository;
    private final SubdivisionRunRepository subdivisionRunRepository;
    private final ComplianceCheckRepository complianceCheckRepository;
    private final ReportRepository reportRepository;
    private final StorageService storageService;
    private final AuditService auditService;
    private final ObjectMapper objectMapper;
    private final ProjectAccessService projectAccessService;

    public ReportService(
            ProjectRepository projectRepository,
            SubdivisionRunRepository subdivisionRunRepository,
            ComplianceCheckRepository complianceCheckRepository,
            ReportRepository reportRepository,
            StorageService storageService,
            AuditService auditService,
            ObjectMapper objectMapper,
            ProjectAccessService projectAccessService
    ) {
        this.projectRepository = projectRepository;
        this.subdivisionRunRepository = subdivisionRunRepository;
        this.complianceCheckRepository = complianceCheckRepository;
        this.reportRepository = reportRepository;
        this.storageService = storageService;
        this.auditService = auditService;
        this.objectMapper = objectMapper;
        this.projectAccessService = projectAccessService;
    }

    @Transactional
    public ReportDtos.ReportDto generate(UserEntity actor, UUID projectId, ReportDtos.GenerateReportRequest req) {
        projectAccessService.requireProjectWrite(actor, projectId);

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
            writePdf(out, report, actor, project, req);
        } catch (IOException ex) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "REPORT_ERROR", "Failed to generate PDF report");
        }

        report.setFilePath(storageService.getRoot().relativize(out).toString());
        report = reportRepository.save(report);

        auditService.log(actor, "REPORT_GENERATED", "Report", report.getId());
        return new ReportDtos.ReportDto(report.getId(), project.getId(), report.getType(), report.getCreatedAt());
    }

    @Transactional(readOnly = true)
    public java.util.List<ReportDtos.ReportDto> list(UserEntity actor, UUID projectId) {
        projectAccessService.requireProjectRead(actor, projectId);
        return reportRepository.findByProjectIdOrderByCreatedAtDesc(projectId).stream()
                .map(r -> new ReportDtos.ReportDto(r.getId(), r.getProject().getId(), r.getType(), r.getCreatedAt()))
                .toList();
    }

    @Transactional(readOnly = true)
    public ReportEntity require(UUID reportId) {
        return reportRepository.findById(reportId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Report not found"));
    }

    @Transactional(readOnly = true)
    public ReportEntity requireAccessible(UserEntity actor, UUID reportId) {
        ReportEntity report = require(reportId);
        projectAccessService.requireProjectRead(actor, report.getProject().getId());
        return report;
    }

    @Transactional(readOnly = true)
    public Path resolvePath(ReportEntity report) {
        return storageService.getRoot().resolve(report.getFilePath()).normalize();
    }

    private void writePdf(Path out, ReportEntity report, UserEntity actor, ProjectEntity project, ReportDtos.GenerateReportRequest req)
            throws IOException {
        try (PDDocument doc = new PDDocument()) {
            PDPage page = new PDPage(PDRectangle.A4);
            doc.addPage(page);

            try (PDPageContentStream cs = new PDPageContentStream(doc, page)) {
                PDRectangle media = page.getMediaBox();
                float pageW = media.getWidth();
                float pageH = media.getHeight();

                drawHeader(cs, pageW, pageH, report, req);

                float cursorY = pageH - 120;
                cursorY = sectionTitle(cs, cursorY, "Project Details");
                cursorY = kv(cs, cursorY, "Project", project.getName());
                cursorY = kv(cs, cursorY, "Client", project.getClient().getName());
                cursorY = kv(cs, cursorY, "Generated at", Instant.now().toString());
                cursorY = kv(cs, cursorY, "Generated by", actor.getUsername());

                cursorY -= 10;

                if (req.type() == ReportType.SUBDIVISION_SUMMARY) {
                    cursorY = drawSubdivisionSummary(cs, pageW, cursorY, project, req);
                }

                if (req.type() == ReportType.COMPLIANCE_SUMMARY) {
                    cursorY = drawComplianceSummary(cs, cursorY, project);
                }

                drawSignatures(cs, pageW);
            }

            Files.createDirectories(out.getParent());
            doc.save(out.toFile());
        }
    }

    private void drawHeader(PDPageContentStream cs, float pageW, float pageH, ReportEntity report, ReportDtos.GenerateReportRequest req)
            throws IOException {
        cs.setNonStrokingColor(new Color(79, 70, 229));
        cs.addRect(0, pageH - 90, pageW, 90);
        cs.fill();

        cs.setNonStrokingColor(Color.WHITE);
        text(cs, PDType1Font.HELVETICA_BOLD, 18, 50, pageH - 45, "GeoSmart-Manager");
        text(cs, PDType1Font.HELVETICA, 10, 50, pageH - 65, "Venus Surveying and Engineering Ltd - Kigali, Rwanda");

        text(cs, PDType1Font.HELVETICA_BOLD, 12, pageW - 220, pageH - 50, "Report: " + req.type().name());
        text(cs, PDType1Font.HELVETICA, 9, pageW - 220, pageH - 67, "ID: " + report.getId());

        cs.setNonStrokingColor(new Color(15, 23, 42));
    }

    private float drawSubdivisionSummary(PDPageContentStream cs, float pageW, float cursorY, ProjectEntity project, ReportDtos.GenerateReportRequest req)
            throws IOException {
        cursorY = sectionTitle(cs, cursorY, "Subdivision Summary");

        Optional<SubdivisionRunEntity> runOpt = resolveRun(project, req);
        if (runOpt.isEmpty()) {
            return bodyLine(cs, cursorY, "No subdivision run found for this project.");
        }

        SubdivisionRunEntity run = runOpt.get();
        cursorY = kv(cs, cursorY, "Subdivision run", run.getId().toString());
        cursorY = kv(cs, cursorY, "Status", run.getStatus().name());
        cursorY = kv(cs, cursorY, "Target parcels", String.valueOf(run.getTargetParcels()));
        cursorY = kv(cs, cursorY, "Min parcel area (sqm)", String.valueOf(run.getMinParcelArea()));
        cursorY = kv(cs, cursorY, "Started at", run.getStartedAt() == null ? "N/A" : run.getStartedAt().toString());
        cursorY = kv(cs, cursorY, "Finished at", run.getFinishedAt() == null ? "N/A" : run.getFinishedAt().toString());

        cursorY -= 8;

        float previewH = 240;
        float previewW = pageW - 100;
        float previewX = 50;
        float previewY = Math.max(180, cursorY - previewH);
        drawPreviewFrame(cs, previewX, previewY, previewW, previewH, "Subdivision preview (schematic)");

        if (run.getStatus() == RunStatus.COMPLETED && run.getResultPath() != null) {
            JsonNode geo = readGeoJson(storageService.getRoot().resolve(run.getResultPath()).normalize());
            drawGeoJsonPreview(cs, geo, previewX + 8, previewY + 10, previewW - 16, previewH - 28);
        } else {
            text(cs, PDType1Font.HELVETICA, 10, previewX + 12, previewY + previewH / 2, "No result geometry available.");
        }

        return previewY - 20;
    }

    private float drawComplianceSummary(PDPageContentStream cs, float cursorY, ProjectEntity project) throws IOException {
        cursorY = sectionTitle(cs, cursorY, "Compliance Summary");

        var latest = complianceCheckRepository.findByProjectIdOrderByCheckedAtDesc(project.getId()).stream()
                .max(Comparator.comparing(c -> c.getCheckedAt() == null ? Instant.EPOCH : c.getCheckedAt()));
        if (latest.isEmpty()) {
            return bodyLine(cs, cursorY, "No compliance checks recorded yet.");
        }

        var c = latest.get();
        cursorY = kv(cs, cursorY, "Latest status", c.getStatus().name());
        cursorY = kv(cs, cursorY, "Checked at", c.getCheckedAt() == null ? "N/A" : c.getCheckedAt().toString());

        JsonNode issues = null;
        try {
            issues = objectMapper.readTree(c.getIssuesJson() == null ? "[]" : c.getIssuesJson());
        } catch (Exception ignored) {
            issues = null;
        }

        int issueCount = (issues != null && issues.isArray()) ? issues.size() : 0;
        cursorY = kv(cs, cursorY, "Issues", String.valueOf(issueCount));

        if (issues != null && issues.isArray() && issueCount > 0) {
            cursorY -= 6;
            cursorY = bodyLine(cs, cursorY, "Top issues:");
            int shown = 0;
            for (JsonNode issue : issues) {
                if (shown >= 6) break;
                String rule = issue.path("rule").asText("");
                String severity = issue.path("severity").asText("");
                String message = issue.path("message").asText("");
                String line = "- " + (rule.isBlank() ? "RULE" : rule) + " (" + (severity.isBlank() ? "INFO" : severity) + "): " + message;
                cursorY = bodyLine(cs, cursorY, truncate(line, 110));
                shown++;
            }
        }

        return cursorY;
    }

    private void drawSignatures(PDPageContentStream cs, float pageW) throws IOException {
        float sigY = 110;
        cs.setStrokingColor(new Color(148, 163, 184));
        cs.setLineWidth(1f);
        cs.moveTo(50, sigY);
        cs.lineTo(250, sigY);
        cs.stroke();
        cs.moveTo(pageW - 250, sigY);
        cs.lineTo(pageW - 50, sigY);
        cs.stroke();

        cs.setNonStrokingColor(new Color(71, 85, 105));
        text(cs, PDType1Font.HELVETICA, 9, 50, sigY - 14, "Prepared by (Engineer)");
        text(cs, PDType1Font.HELVETICA, 9, pageW - 250, sigY - 14, "Approved by (Admin)");
    }

    private Optional<SubdivisionRunEntity> resolveRun(ProjectEntity project, ReportDtos.GenerateReportRequest req) {
        return req.subdivisionRunId() == null
                ? subdivisionRunRepository.findByProjectIdOrderByStartedAtDesc(project.getId()).stream().findFirst()
                : subdivisionRunRepository.findById(req.subdivisionRunId());
    }

    private JsonNode readGeoJson(Path path) {
        try {
            return objectMapper.readTree(Files.readString(path));
        } catch (Exception ex) {
            return null;
        }
    }

    private void drawPreviewFrame(PDPageContentStream cs, float x, float y, float w, float h, String title) throws IOException {
        cs.setStrokingColor(new Color(203, 213, 225));
        cs.setNonStrokingColor(Color.WHITE);
        cs.setLineWidth(1f);
        cs.addRect(x, y, w, h);
        cs.fillAndStroke();
        cs.setNonStrokingColor(new Color(71, 85, 105));
        text(cs, PDType1Font.HELVETICA_BOLD, 10, x + 8, y + h - 16, title);
    }

    private void drawGeoJsonPreview(PDPageContentStream cs, JsonNode geo, float x, float y, float w, float h) throws IOException {
        if (geo == null) {
            return;
        }
        JsonNode features = geo.path("features");
        if (!features.isArray() || features.size() == 0) {
            return;
        }

        double minX = Double.POSITIVE_INFINITY;
        double minY = Double.POSITIVE_INFINITY;
        double maxX = Double.NEGATIVE_INFINITY;
        double maxY = Double.NEGATIVE_INFINITY;

        for (JsonNode f : features) {
            for (var ring : extractOuterRings(f.path("geometry"))) {
                for (double[] pt : ring) {
                    minX = Math.min(minX, pt[0]);
                    minY = Math.min(minY, pt[1]);
                    maxX = Math.max(maxX, pt[0]);
                    maxY = Math.max(maxY, pt[1]);
                }
            }
        }

        if (!Double.isFinite(minX) || !Double.isFinite(minY) || !Double.isFinite(maxX) || !Double.isFinite(maxY)) {
            return;
        }

        double dataW = Math.max(1e-9, maxX - minX);
        double dataH = Math.max(1e-9, maxY - minY);
        double s = Math.min(w / dataW, h / dataH);
        double padX = (w - (dataW * s)) / 2.0;
        double padY = (h - (dataH * s)) / 2.0;

        cs.setLineWidth(1.2f);
        cs.setStrokingColor(new Color(79, 70, 229));
        cs.setNonStrokingColor(new Color(238, 242, 255));

        for (JsonNode f : features) {
            var rings = extractOuterRings(f.path("geometry"));
            if (rings.isEmpty()) {
                continue;
            }

            float cx = 0;
            float cy = 0;
            int n = 0;

            for (var pts : rings) {
                if (pts.isEmpty()) {
                    continue;
                }

                boolean started = false;
                for (double[] pt : pts) {
                    float px = (float) (x + padX + ((pt[0] - minX) * s));
                    float py = (float) (y + padY + ((pt[1] - minY) * s));
                    if (!started) {
                        cs.moveTo(px, py);
                        started = true;
                    } else {
                        cs.lineTo(px, py);
                    }
                    cx += px;
                    cy += py;
                    n++;
                }

                cs.closePath();
                cs.fillAndStroke();
            }

            if (n > 0) {
                float lx = cx / n;
                float ly = cy / n;
                JsonNode parcelNo = f.path("properties").path("parcelNo");
                if (!parcelNo.isMissingNode()) {
                    cs.setNonStrokingColor(new Color(30, 41, 59));
                    text(cs, PDType1Font.HELVETICA_BOLD, 8, lx - 4, ly - 3, truncate(parcelNo.asText(), 6));
                    cs.setNonStrokingColor(new Color(238, 242, 255));
                }
            }
        }
    }

    private java.util.List<java.util.List<double[]>> extractOuterRings(JsonNode geometry) {
        if (geometry == null || !geometry.isObject()) {
            return java.util.List.of();
        }
        String type = geometry.path("type").asText("");
        JsonNode coords = geometry.path("coordinates");
        if (!coords.isArray()) {
            return java.util.List.of();
        }

        java.util.List<java.util.List<double[]>> rings = new java.util.ArrayList<>();

        if ("Polygon".equals(type)) {
            addRing(coords.path(0), rings);
        } else if ("MultiPolygon".equals(type)) {
            for (JsonNode poly : coords) {
                addRing(poly.path(0), rings);
            }
        }

        return rings;
    }

    private void addRing(JsonNode ringNode, java.util.List<java.util.List<double[]>> out) {
        if (ringNode == null || !ringNode.isArray()) {
            return;
        }

        java.util.List<double[]> pts = new java.util.ArrayList<>();
        for (JsonNode pt : ringNode) {
            if (pt.isArray() && pt.size() >= 2) {
                pts.add(new double[] { pt.path(0).asDouble(), pt.path(1).asDouble() });
            }
        }

        if (!pts.isEmpty()) {
            out.add(pts);
        }
    }

    private float sectionTitle(PDPageContentStream cs, float y, String title) throws IOException {
        cs.setNonStrokingColor(new Color(15, 23, 42));
        text(cs, PDType1Font.HELVETICA_BOLD, 12, 50, y, title);
        cs.setStrokingColor(new Color(226, 232, 240));
        cs.setLineWidth(1f);
        cs.moveTo(50, y - 6);
        cs.lineTo(545, y - 6);
        cs.stroke();
        return y - 22;
    }

    private float kv(PDPageContentStream cs, float y, String key, String value) throws IOException {
        cs.setNonStrokingColor(new Color(71, 85, 105));
        text(cs, PDType1Font.HELVETICA_BOLD, 9, 50, y, truncate(key, 30) + ":");
        cs.setNonStrokingColor(new Color(15, 23, 42));
        text(cs, PDType1Font.HELVETICA, 10, 170, y, truncate(value == null ? "N/A" : value, 80));
        return y - 16;
    }

    private float bodyLine(PDPageContentStream cs, float y, String text) throws IOException {
        cs.setNonStrokingColor(new Color(15, 23, 42));
        this.text(cs, PDType1Font.HELVETICA, 10, 50, y, truncate(text, 120));
        return y - 16;
    }

    private void text(PDPageContentStream cs, PDType1Font font, float size, float x, float y, String text) throws IOException {
        cs.beginText();
        cs.setFont(font, size);
        cs.newLineAtOffset(x, y);
        cs.showText(text == null ? "" : text);
        cs.endText();
    }

    private String truncate(String s, int max) {
        if (s == null) return "";
        if (max <= 0) return "";
        if (s.length() <= max) return s;
        return s.substring(0, Math.max(0, max - 3)) + "...";
    }
}
