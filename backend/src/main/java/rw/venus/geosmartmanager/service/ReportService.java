package rw.venus.geosmartmanager.service;

import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDFont;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.springframework.stereotype.Service;
import java.io.IOException;
import rw.venus.geosmartmanager.api.dto.PlannerDtos;
import rw.venus.geosmartmanager.api.dto.ProjectDtos;
import rw.venus.geosmartmanager.api.dto.ReportDtos;
import rw.venus.geosmartmanager.domain.ReportType;
import rw.venus.geosmartmanager.entity.ProjectEntity;
import rw.venus.geosmartmanager.entity.ReportEntity;
import rw.venus.geosmartmanager.entity.SubdivisionRunEntity;
import rw.venus.geosmartmanager.entity.ComplianceCheckEntity;
import rw.venus.geosmartmanager.entity.DatasetEntity;
import rw.venus.geosmartmanager.entity.UserEntity;
import rw.venus.geosmartmanager.repo.ComplianceCheckRepository;
import rw.venus.geosmartmanager.repo.DatasetRepository;
import rw.venus.geosmartmanager.repo.ReportRepository;
import rw.venus.geosmartmanager.repo.SubdivisionRunRepository;

import java.awt.Color;
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
    private final ProjectService projectService;
    private final DatasetRepository datasetRepository;
    private final SubdivisionRunRepository subdivisionRunRepository;
    private final ComplianceCheckRepository complianceCheckRepository;
    private final AuditService auditService;
    private final CurrentUserService currentUserService;
    private final PdfBrandingSupport pdfBrandingSupport;
    private final GisPlannerService gisPlannerService;

    public ReportService(ReportRepository reportRepository,
                         ProjectService projectService,
                         DatasetRepository datasetRepository,
                         SubdivisionRunRepository subdivisionRunRepository,
                         ComplianceCheckRepository complianceCheckRepository,
                         AuditService auditService,
                         CurrentUserService currentUserService,
                         PdfBrandingSupport pdfBrandingSupport,
                         GisPlannerService gisPlannerService) {
        this.reportRepository = reportRepository;
        this.projectService = projectService;
        this.datasetRepository = datasetRepository;
        this.subdivisionRunRepository = subdivisionRunRepository;
        this.complianceCheckRepository = complianceCheckRepository;
        this.auditService = auditService;
        this.currentUserService = currentUserService;
        this.pdfBrandingSupport = pdfBrandingSupport;
        this.gisPlannerService = gisPlannerService;
    }

    public ReportEntity generate(Long projectId, ReportDtos.GenerateReportRequest request) {
        ProjectEntity project = projectService.getProject(projectId);

        String content = buildReportContent(project, request.type());

        ReportEntity report = ReportEntity.builder()
                .project(project)
                .type(request.type())
                .content(content)
                .generatedBy(currentUserService.getCurrentUser())
                .createdAt(Instant.now())
                .build();
        reportRepository.save(report);
        auditService.log(currentUserService.getCurrentUserEmail(), "GENERATE", "Report", report.getId(), "Report generated");
        return report;
    }

    @org.springframework.transaction.annotation.Transactional
    public ProjectDtos.ProjectPlannerReportResponse generatePlannerReportForProject(Long projectId, PlannerDtos.SubdivisionCheckRequest request) {
        ProjectEntity project = projectService.getActiveProject(projectId);
        PlannerDtos.PlannerReportResponse plannerReport = gisPlannerService.generateReport(request);

        projectService.recordSubdivisionDraft(projectId, plannerReport.report().proposedPlotCount(), request.proposedLandUse());
        projectService.recordComplianceCheck(projectId, plannerReport.report().complianceScore(), plannerReport.report().recommendation());

        ReportEntity projectReport = ReportEntity.builder()
                .project(project)
                .type(ReportType.SUBDIVISION)
                .content(plannerReport.reportMarkdown())
                .generatedBy(currentUserService.getCurrentUser())
                .createdAt(Instant.now())
                .build();
        reportRepository.save(projectReport);

        projectService.markPlannerReportReady(projectId);
        auditService.log(currentUserService.getCurrentUserEmail(), "GENERATE", "Report", projectReport.getId(), "Project subdivision report generated");

        return new ProjectDtos.ProjectPlannerReportResponse(
                projectId,
                projectReport.getId(),
                plannerReport.createdAt(),
                plannerReport.reportMarkdown(),
                plannerReport.report()
        );
    }

    public List<ReportEntity> listByProject(Long projectId) {
        projectService.getProject(projectId);
        return reportRepository.findByProjectIdOrderByCreatedAtDesc(projectId);
    }

    public ReportEntity getReport(Long projectId, Long reportId) {
        projectService.getProject(projectId);
        return reportRepository.findByIdAndProjectId(reportId, projectId)
                .orElseThrow(() -> new IllegalArgumentException("Report not found"));
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

    public byte[] generatePdf(ReportEntity report) {
        try (PDDocument document = new PDDocument()) {
            PdfBrandingSupport.PdfFonts fonts = pdfBrandingSupport.loadUiFonts(document);
            PDPage page = new PDPage(PDRectangle.A4);
            document.addPage(page);

            float pageWidth = page.getMediaBox().getWidth();
            float pageHeight = page.getMediaBox().getHeight();
            float y = pageHeight - MARGIN;
            PDPageContentStream content = new PDPageContentStream(document, page);
            
            // Draw Logo on first page
            float logoHeight = pdfBrandingSupport.drawLogo(document, content, MARGIN, y + 10f, 150f);
            
            ProjectEntity project = report.getProject();
            DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm").withZone(ZoneId.of("Africa/Kigali"));
            String created = formatter.format(report.getCreatedAt());
            UserEntity generatedBy = report.getGeneratedBy();

            // Right-aligned Date
            content.beginText();
            content.setFont(fonts.regular(), 8.5f);
            content.setNonStrokingColor(new Color(100, 116, 139)); // Slate
            String topDateStr = "Date: " + created;
            float dateWidth = fonts.regular().getStringWidth(topDateStr) / 1000f * 8.5f;
            content.newLineAtOffset(pageWidth - MARGIN - dateWidth, y - 2f);
            content.showText(topDateStr);
            content.endText();

            // Adjust y and draw horizontal divider
            y -= logoHeight + 12f;
            content.setStrokingColor(new Color(6, 63, 53)); // brand.deep
            content.setLineWidth(2f);
            content.moveTo(MARGIN, y);
            content.lineTo(pageWidth - MARGIN, y);
            content.stroke();
            y -= 25f;

            // Title
            content.beginText();
            content.setFont(fonts.bold(), 20f);
            content.setNonStrokingColor(new Color(16, 32, 27)); // brand.ink
            content.newLineAtOffset(MARGIN, y - 16f);
            String titleText = getReportTitle(report.getType());
            content.showText(cleanTextForPdf(titleText, fonts.bold()));
            content.endText();
            y -= 28f;

            // Metadata Card
            float cardHeight = 70f;
            content.setNonStrokingColor(new Color(247, 250, 244)); // brand.sage
            content.addRect(MARGIN, y - cardHeight, pageWidth - 2 * MARGIN, cardHeight);
            content.fill();

            content.setStrokingColor(new Color(226, 232, 240)); // brand.clay (divider)
            content.setLineWidth(1f);
            content.addRect(MARGIN, y - cardHeight, pageWidth - 2 * MARGIN, cardHeight);
            content.stroke();

            // Vertical indicator line inside card
            content.setStrokingColor(new Color(16, 185, 129)); // brand.emerald
            content.setLineWidth(3f);
            content.moveTo(MARGIN + 12f, y - 8f);
            content.lineTo(MARGIN + 12f, y - cardHeight + 8f);
            content.stroke();

            // Metadata text inside card
            float textX = MARGIN + 22f;
            float textY = y - 18f;

            // Row 1
            content.beginText();
            content.setFont(fonts.bold(), 8.5f);
            content.setNonStrokingColor(new Color(6, 63, 53));
            content.newLineAtOffset(textX, textY);
            content.showText("PROJECT: ");
            content.setFont(fonts.regular(), 8.5f);
            content.setNonStrokingColor(new Color(16, 32, 27));
            String projectInfo = getReportProjectInfo(report);
            content.showText(cleanTextForPdf(projectInfo, fonts.regular()));
            content.endText();

            // Column 2 of Row 1
            content.beginText();
            content.setFont(fonts.bold(), 8.5f);
            content.setNonStrokingColor(new Color(6, 63, 53));
            content.newLineAtOffset(textX + 240f, textY);
            content.showText("REPORT TYPE: ");
            content.setFont(fonts.regular(), 8.5f);
            content.setNonStrokingColor(new Color(16, 32, 27));
            String reportTypeStr = report.getType() != null ? report.getType().toString() : "N/A";
            content.showText(reportTypeStr);
            content.endText();

            // Row 2
            textY -= 18f;
            content.beginText();
            content.setFont(fonts.bold(), 8.5f);
            content.setNonStrokingColor(new Color(6, 63, 53));
            content.newLineAtOffset(textX, textY);
            content.showText("GENERATED BY: ");
            content.setFont(fonts.regular(), 8.5f);
            content.setNonStrokingColor(new Color(16, 32, 27));
            String userStr = generatedBy != null ? generatedBy.getFullName() + " (" + generatedBy.getEmail() + ")" : "System";
            content.showText(cleanTextForPdf(userStr, fonts.regular()));
            content.endText();

            // Column 2 of Row 2
            content.beginText();
            content.setFont(fonts.bold(), 8.5f);
            content.setNonStrokingColor(new Color(6, 63, 53));
            content.newLineAtOffset(textX + 240f, textY);
            content.showText("TIMESTAMP: ");
            content.setFont(fonts.regular(), 8.5f);
            content.setNonStrokingColor(new Color(16, 32, 27));
            content.showText(created + " CAT");
            content.endText();

            // Row 3 (Status)
            textY -= 18f;
            content.beginText();
            content.setFont(fonts.bold(), 8.5f);
            content.setNonStrokingColor(new Color(6, 63, 53));
            content.newLineAtOffset(textX, textY);
            content.showText("STATUS: ");
            content.setFont(fonts.bold(), 8.5f);
            
            Color statusColor = new Color(16, 185, 129); // success emerald
            String status = getReportStatus(report);
            if (status != null) {
                if (status.contains("FAIL") || status.contains("REJECT") || status.contains("NEEDS_MORE_INFO")) {
                    statusColor = new Color(239, 68, 68); // red
                } else if (status.contains("RUNNING") || status.contains("PENDING")) {
                    statusColor = new Color(245, 158, 11); // amber
                }
            }
            content.setNonStrokingColor(statusColor);
            content.showText(cleanTextForPdf(status, fonts.bold()));
            content.endText();

            y -= cardHeight + 20f;

            // Parse document content
            List<PdfElement> elements = new ArrayList<>();
            String contentText = report.getContent() == null ? "" : report.getContent();
            boolean inAlert = false;

            for (String rawLine : contentText.split("\\r?\\n")) {
                String trimmed = rawLine.trim();
                if (trimmed.isEmpty()) {
                    elements.add(new PdfElement(ElementType.SPACER, ""));
                    continue;
                }

                // Check for alert block
                if (trimmed.startsWith(">")) {
                    String alertText = trimmed.substring(1).trim();
                    if (alertText.startsWith("[!")) {
                        int endIdx = alertText.indexOf("]");
                        if (endIdx != -1) {
                            alertText = alertText.substring(endIdx + 1).trim();
                        }
                    }

                    if (!inAlert) {
                        elements.add(new PdfElement(ElementType.ALERT_START, ""));
                        inAlert = true;
                    }
                    elements.add(new PdfElement(ElementType.ALERT_LINE, alertText));
                    continue;
                } else if (inAlert) {
                    elements.add(new PdfElement(ElementType.ALERT_END, ""));
                    inAlert = false;
                }

                // Check for headers
                if (trimmed.startsWith("### ")) {
                    elements.add(new PdfElement(ElementType.SUBHEADING, trimmed.substring(4).trim()));
                } else if (trimmed.startsWith("## ")) {
                    elements.add(new PdfElement(ElementType.HEADING, trimmed.substring(3).trim()));
                } else if (trimmed.startsWith("# ")) {
                    elements.add(new PdfElement(ElementType.HEADING, trimmed.substring(2).trim()));
                } else if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
                    elements.add(new PdfElement(ElementType.BULLET, trimmed.substring(2).trim()));
                } else if (trimmed.startsWith("|") && trimmed.contains("|")) {
                    if (trimmed.replace("-", "").replace("|", "").replace(":", "").trim().isEmpty()) {
                        elements.add(new PdfElement(ElementType.TABLE_DIVIDER, ""));
                    } else {
                        String[] cells = trimmed.split("\\|");
                        List<String> cleanedCells = new ArrayList<>();
                        for (int c = 0; c < cells.length; c++) {
                            String cell = cells[c].trim();
                            if (c == 0 && cell.isEmpty()) continue;
                            cleanedCells.add(cell);
                        }
                        if (!cleanedCells.isEmpty() && cleanedCells.get(cleanedCells.size() - 1).isEmpty() && trimmed.endsWith("|")) {
                            cleanedCells.remove(cleanedCells.size() - 1);
                        }

                        boolean isHeader = true;
                        for (int e = elements.size() - 1; e >= 0; e--) {
                            ElementType prevType = elements.get(e).type;
                            if (prevType == ElementType.TABLE_ROW || prevType == ElementType.TABLE_HEADER || prevType == ElementType.TABLE_DIVIDER) {
                                isHeader = false;
                                break;
                            }
                        }

                        elements.add(new PdfElement(
                            isHeader ? ElementType.TABLE_HEADER : ElementType.TABLE_ROW,
                            cleanedCells.toArray(new String[0])
                        ));
                    }
                } else {
                    elements.add(new PdfElement(ElementType.NORMAL, rawLine));
                }
            }
            if (inAlert) {
                elements.add(new PdfElement(ElementType.ALERT_END, ""));
            }

            // Wrap and prepare render queue
            List<RenderElement> renderQueue = new ArrayList<>();
            float usableWidth = pageWidth - 2 * MARGIN;

            for (PdfElement el : elements) {
                switch (el.type) {
                    case TITLE -> {}
                    case HEADING -> {
                        List<String> wrapped = wrapTextByWidth(el.text, fonts.bold(), 12f, usableWidth);
                        for (String w : wrapped) {
                            renderQueue.add(new RenderElement(ElementType.HEADING, w, fonts.bold(), 12f, new Color(6, 63, 53), 0f, 14f, 12f, 4f));
                        }
                    }
                    case SUBHEADING -> {
                        List<String> wrapped = wrapTextByWidth(el.text, fonts.bold(), 10f, usableWidth);
                        for (String w : wrapped) {
                            renderQueue.add(new RenderElement(ElementType.SUBHEADING, w, fonts.bold(), 10f, new Color(16, 32, 27), 0f, 12f, 8f, 3f));
                        }
                    }
                    case NORMAL -> {
                        List<String> wrapped = wrapTextByWidth(el.text, fonts.serifRegular(), 9.5f, usableWidth);
                        for (String w : wrapped) {
                            renderQueue.add(new RenderElement(ElementType.NORMAL, w, fonts.serifRegular(), 9.5f, new Color(55, 65, 81), 0f, 12f, 0f, 3f));
                        }
                    }
                    case BULLET -> {
                        List<String> wrapped = wrapTextByWidth(el.text, fonts.serifRegular(), 9.5f, usableWidth - 15f);
                        for (int i = 0; i < wrapped.size(); i++) {
                            String text = wrapped.get(i);
                            if (i == 0) {
                                renderQueue.add(new RenderElement(ElementType.BULLET, "- " + text, fonts.serifRegular(), 9.5f, new Color(55, 65, 81), 5f, 12f, 1f, 2f));
                            } else {
                                renderQueue.add(new RenderElement(ElementType.BULLET, text, fonts.serifRegular(), 9.5f, new Color(55, 65, 81), 12f, 12f, 0f, 2f));
                            }
                        }
                    }
                    case ALERT_START -> {
                        renderQueue.add(new RenderElement(ElementType.ALERT_START, "", fonts.regular(), 9.5f, Color.BLACK, 0f, 0f, 4f, 0f));
                    }
                    case ALERT_LINE -> {
                        List<String> wrapped = wrapTextByWidth(el.text, fonts.serifRegular(), 9.5f, usableWidth - 25f);
                        for (String w : wrapped) {
                            renderQueue.add(new RenderElement(ElementType.ALERT_LINE, w, fonts.serifRegular(), 9.5f, new Color(6, 63, 53), 20f, 12f, 0f, 2f));
                        }
                    }
                    case ALERT_END -> {
                        renderQueue.add(new RenderElement(ElementType.ALERT_END, "", fonts.regular(), 9.5f, Color.BLACK, 0f, 0f, 0f, 4f));
                    }
                    case TABLE_DIVIDER -> {
                        renderQueue.add(new RenderElement(ElementType.TABLE_DIVIDER, "", fonts.regular(), 9.5f, Color.BLACK, 0f, 1f, 1f, 1f));
                    }
                    case TABLE_HEADER -> {
                        renderQueue.add(new RenderElement(ElementType.TABLE_HEADER, el.tableCells));
                    }
                    case TABLE_ROW -> {
                        renderQueue.add(new RenderElement(ElementType.TABLE_ROW, el.tableCells));
                    }
                    case SPACER -> {
                        renderQueue.add(new RenderElement(ElementType.SPACER, "", fonts.regular(), 9.5f, Color.BLACK, 0f, 6f, 0f, 0f));
                    }
                }
            }

            // Draw elements with page breaking
            for (int i = 0; i < renderQueue.size(); i++) {
                RenderElement el = renderQueue.get(i);
                
                // Pre-calculating alert height for background drawing
                if (el.type == ElementType.ALERT_START) {
                    float alertHeight = 0f;
                    for (int j = i + 1; j < renderQueue.size(); j++) {
                        RenderElement next = renderQueue.get(j);
                        if (next.type == ElementType.ALERT_END) break;
                        alertHeight += next.height + next.spacingBefore + next.spacingAfter;
                    }
                    
                    if (y - alertHeight < MARGIN + 20f) {
                        content.close();
                        page = new PDPage(PDRectangle.A4);
                        document.addPage(page);
                        y = pageHeight - MARGIN;
                        content = new PDPageContentStream(document, page);
                        float headerHeight = drawPageHeader(document, content, fonts, pageWidth, pageHeight);
                        y -= headerHeight;
                    }
                    
                    content.setNonStrokingColor(new Color(247, 250, 244)); // brand.sage
                    content.addRect(MARGIN, y - alertHeight - 4f, usableWidth, alertHeight + 8f);
                    content.fill();
                    
                    content.setStrokingColor(new Color(16, 185, 129)); // brand.emerald
                    content.setLineWidth(2f);
                    content.moveTo(MARGIN + 6f, y + 4f);
                    content.lineTo(MARGIN + 6f, y - alertHeight - 4f);
                    content.stroke();
                    continue;
                }
                
                if (el.type == ElementType.ALERT_END) continue;

                float requiredHeight = el.height + el.spacingBefore + el.spacingAfter;
                if (y - requiredHeight < MARGIN + 20f) {
                    content.close();
                    page = new PDPage(PDRectangle.A4);
                    document.addPage(page);
                    y = pageHeight - MARGIN;
                    content = new PDPageContentStream(document, page);
                    float headerHeight = drawPageHeader(document, content, fonts, pageWidth, pageHeight);
                    y -= headerHeight;
                }

                y -= el.spacingBefore;

                if (el.type == ElementType.SPACER) {
                    y -= el.height;
                    continue;
                }

                if (el.type == ElementType.TABLE_HEADER) {
                    int numCols = el.cells.length;
                    float colWidth = usableWidth / numCols;
                    
                    content.setNonStrokingColor(new Color(6, 63, 53)); // brand.deep
                    content.addRect(MARGIN, y - el.height, usableWidth, el.height);
                    content.fill();
                    
                    for (int col = 0; col < numCols; col++) {
                        content.beginText();
                        content.setFont(fonts.bold(), 8.5f);
                        content.setNonStrokingColor(Color.WHITE);
                        content.newLineAtOffset(MARGIN + col * colWidth + 6f, y - el.height + 4f);
                        
                        String cellText = el.cells[col];
                        float maxCellTextWidth = colWidth - 12f;
                        while (fonts.bold().getStringWidth(cleanTextForPdf(cellText, fonts.bold())) / 1000f * 8.5f > maxCellTextWidth && cellText.length() > 3) {
                            cellText = cellText.substring(0, cellText.length() - 2) + "..";
                        }
                        content.showText(cleanTextForPdf(cellText, fonts.bold()));
                        content.endText();
                    }
                    
                    y -= el.height;
                    y -= el.spacingAfter;
                } else if (el.type == ElementType.TABLE_ROW) {
                    int numCols = el.cells.length;
                    float colWidth = usableWidth / numCols;
                    
                    content.setNonStrokingColor(new Color(249, 250, 251)); // alternate light gray
                    content.addRect(MARGIN, y - el.height, usableWidth, el.height);
                    content.fill();
                    
                    content.setStrokingColor(new Color(229, 231, 235)); // brand.clay border
                    content.setLineWidth(0.5f);
                    content.moveTo(MARGIN, y - el.height);
                    content.lineTo(MARGIN + usableWidth, y - el.height);
                    content.stroke();
                    
                    for (int col = 1; col < numCols; col++) {
                        content.moveTo(MARGIN + col * colWidth, y);
                        content.lineTo(MARGIN + col * colWidth, y - el.height);
                        content.stroke();
                    }
                    
                    for (int col = 0; col < numCols; col++) {
                        content.beginText();
                        content.setFont(fonts.regular(), 8f);
                        content.setNonStrokingColor(new Color(55, 65, 81));
                        content.newLineAtOffset(MARGIN + col * colWidth + 6f, y - el.height + 4f);
                        
                        String cellText = el.cells[col];
                        float maxCellTextWidth = colWidth - 12f;
                        while (fonts.regular().getStringWidth(cleanTextForPdf(cellText, fonts.regular())) / 1000f * 8f > maxCellTextWidth && cellText.length() > 3) {
                            cellText = cellText.substring(0, cellText.length() - 2) + "..";
                        }
                        content.showText(cleanTextForPdf(cellText, fonts.regular()));
                        content.endText();
                    }
                    
                    y -= el.height;
                    y -= el.spacingAfter;
                } else if (el.text != null && !el.text.isEmpty()) {
                    content.beginText();
                    content.setFont(el.font, el.fontSize);
                    content.setNonStrokingColor(el.color);
                    content.newLineAtOffset(MARGIN + el.indent, y - el.height + 2f);
                    content.showText(cleanTextForPdf(el.text, el.font));
                    content.endText();
                    
                    y -= el.height;
                    y -= el.spacingAfter;
                }
            }

            content.close();

            // Second pass for running footers and total page numbers
            int totalPages = document.getNumberOfPages();
            for (int pIndex = 0; pIndex < totalPages; pIndex++) {
                PDPage p = document.getPage(pIndex);
                try (PDPageContentStream footerStream = new PDPageContentStream(document, p, PDPageContentStream.AppendMode.APPEND, true, true)) {
                    footerStream.beginText();
                    footerStream.setFont(fonts.regular(), 8f);
                    footerStream.setNonStrokingColor(new Color(156, 163, 175)); // light gray
                    footerStream.newLineAtOffset(MARGIN, 30f);
                    footerStream.showText("GeoSmart Manager — Automated Spatial Planning Report");
                    footerStream.endText();

                    footerStream.beginText();
                    footerStream.setFont(fonts.regular(), 8f);
                    footerStream.setNonStrokingColor(new Color(156, 163, 175));
                    String pageNumText = "Page " + (pIndex + 1) + " of " + totalPages;
                    float textWidth = fonts.regular().getStringWidth(pageNumText) / 1000f * 8f;
                    footerStream.newLineAtOffset(pageWidth - MARGIN - textWidth, 30f);
                    footerStream.showText(pageNumText);
                    footerStream.endText();
                }
            }

            ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
            document.save(outputStream);
            return outputStream.toByteArray();
        } catch (Exception ex) {
            throw new IllegalStateException("Failed to generate PDF report", ex);
        }
    }

    private String getReportTitle(ReportType type) {
        if (type == null) return "GeoSmart Manager — Spatial Report";
        switch (type) {
            case PROJECT_SUMMARY:
                return "GeoSmart Manager — Spatial Audit Report";
            case SUBDIVISION:
                return "GeoSmart Manager — Subdivision Report";
            case COMPLIANCE:
                return "GeoSmart Manager — Compliance Report";
            case SURVEY:
                return "GeoSmart Manager — Survey Report";
            default:
                String name = type.name().replace("_", " ");
                StringBuilder sb = new StringBuilder();
                for (String word : name.split(" ")) {
                    if (!word.isEmpty()) {
                        sb.append(Character.toUpperCase(word.charAt(0)))
                          .append(word.substring(1).toLowerCase())
                          .append(" ");
                    }
                }
                return "GeoSmart Manager — " + sb.toString().trim() + " Report";
        }
    }

    private String getReportStatus(ReportEntity report) {
        if (report == null || report.getType() == null) return "N/A";
        if (report.getType() == ReportType.PROJECT_SUMMARY) {
            return "ACTIVE / AUDITED";
        }
        switch (report.getType()) {
            case SUBDIVISION: {
                try {
                    List<SubdivisionRunEntity> runs = subdivisionRunRepository.findByProjectId(report.getProject().getId());
                    SubdivisionRunEntity latestRun = runs.stream()
                            .max(java.util.Comparator.comparing(SubdivisionRunEntity::getCreatedAt))
                            .orElse(null);
                    return latestRun != null && latestRun.getStatus() != null ? latestRun.getStatus().name() : "ACTIVE";
                } catch (Exception e) {
                    return "ACTIVE";
                }
            }
            case COMPLIANCE: {
                try {
                    List<ComplianceCheckEntity> checks = complianceCheckRepository.findByProjectId(report.getProject().getId());
                    ComplianceCheckEntity latestCheck = checks.stream()
                            .max(java.util.Comparator.comparing(ComplianceCheckEntity::getCheckedAt))
                            .orElse(null);
                    return latestCheck != null && latestCheck.getStatus() != null ? latestCheck.getStatus().name() : "ACTIVE";
                } catch (Exception e) {
                    return "ACTIVE";
                }
            }
            case SURVEY:
            default:
                return report.getProject().getStatus() != null ? report.getProject().getStatus().name() : "ACTIVE";
        }
    }

    private String getReportProjectInfo(ReportEntity report) {
        if (report == null || report.getProject() == null) return "N/A";
        ProjectEntity project = report.getProject();
        String projectVal = project.getName() + " (" + project.getCode() + ")";
        if (report.getType() == ReportType.SUBDIVISION && project.getRequestedUpi() != null) {
            projectVal = "UPI " + project.getRequestedUpi();
        } else if (report.getType() == ReportType.COMPLIANCE && project.getRequestedUpi() != null) {
            projectVal = "UPI " + project.getRequestedUpi();
        } else if (report.getType() == ReportType.SURVEY) {
            try {
                List<DatasetEntity> datasets = datasetRepository.findByProjectId(project.getId());
                if (datasets != null && !datasets.isEmpty()) {
                    projectVal = datasets.get(0).getName();
                }
            } catch (Exception e) {
                // Ignore and use default
            }
        }
        return projectVal;
    }

    private float drawPageHeader(PDDocument document, PDPageContentStream content, PdfBrandingSupport.PdfFonts fonts, float pageWidth, float pageHeight) throws IOException {
        float logoHeight = pdfBrandingSupport.drawLogo(document, content, MARGIN, pageHeight - MARGIN + 10f, 100f);
        
        float textY = pageHeight - MARGIN - logoHeight / 2f;
        content.beginText();
        content.setFont(fonts.bold(), 8f);
        content.setNonStrokingColor(new Color(6, 63, 53));
        content.newLineAtOffset(MARGIN + 120f, textY - 3f);
        content.showText("GeoSmart Manager — Spatial Analysis & Audit Report");
        content.endText();
        
        content.setStrokingColor(new Color(226, 232, 240));
        content.setLineWidth(0.5f);
        content.moveTo(MARGIN, pageHeight - MARGIN - logoHeight - 5f);
        content.lineTo(pageWidth - MARGIN, pageHeight - MARGIN - logoHeight - 5f);
        content.stroke();
        
        return logoHeight + 15f;
    }

    private String cleanTextForPdf(String text, PDFont font) {
        if (text == null) return "";
        if (font instanceof org.apache.pdfbox.pdmodel.font.PDType1Font) {
            return text.replace("\u2022", "-")
                       .replace("\u201c", "\"")
                       .replace("\u201d", "\"")
                       .replace("\u2019", "'")
                       .replace("\u2018", "'")
                       .replace("\u2014", "-")
                       .replaceAll("[^\\x20-\\x7E]", "");
        }
        return text.replace("\r", "").replace("\n", "");
    }

    private List<String> wrapTextByWidth(String text, PDFont font, float fontSize, float maxWidth) throws IOException {
        List<String> wrappedLines = new ArrayList<>();
        if (text == null || text.isEmpty()) {
            return wrappedLines;
        }
        
        String[] words = text.split(" ");
        StringBuilder currentLine = new StringBuilder();
        
        for (String word : words) {
            if (word.isEmpty()) continue;
            String testLine = currentLine.length() == 0 ? word : currentLine + " " + word;
            String cleaned = cleanTextForPdf(testLine, font);
            float width = font.getStringWidth(cleaned) / 1000f * fontSize;
            if (width > maxWidth) {
                if (currentLine.length() > 0) {
                    wrappedLines.add(currentLine.toString());
                    currentLine = new StringBuilder(word);
                } else {
                    wrappedLines.add(word);
                    currentLine = new StringBuilder();
                }
            } else {
                currentLine = new StringBuilder(testLine);
            }
        }
        if (currentLine.length() > 0) {
            wrappedLines.add(currentLine.toString());
        }
        return wrappedLines;
    }

    private enum ElementType {
        TITLE, HEADING, SUBHEADING, NORMAL, BULLET, ALERT_START, ALERT_LINE, ALERT_END, TABLE_HEADER, TABLE_ROW, TABLE_DIVIDER, SPACER
    }

    private static class PdfElement {
        ElementType type;
        String text;
        String[] tableCells;
        
        public PdfElement(ElementType type, String text) {
            this.type = type;
            this.text = text;
            this.tableCells = null;
        }

        public PdfElement(ElementType type, String[] tableCells) {
            this.type = type;
            this.text = null;
            this.tableCells = tableCells;
        }
    }

    private static class RenderElement {
        ElementType type;
        String text;
        String[] cells;
        PDFont font;
        float fontSize;
        Color color;
        float indent;
        float height;
        float spacingBefore;
        float spacingAfter;

        public RenderElement(ElementType type, String text, PDFont font, float fontSize, Color color, float indent, float height, float spacingBefore, float spacingAfter) {
            this.type = type;
            this.text = text;
            this.cells = null;
            this.font = font;
            this.fontSize = fontSize;
            this.color = color;
            this.indent = indent;
            this.height = height;
            this.spacingBefore = spacingBefore;
            this.spacingAfter = spacingAfter;
        }

        public RenderElement(ElementType type, String[] cells) {
            this.type = type;
            this.text = null;
            this.cells = cells;
            this.font = null;
            this.fontSize = 9f;
            this.color = null;
            this.indent = 0f;
            this.height = 16f;
            this.spacingBefore = 0f;
            this.spacingAfter = 0f;
        }
    }
}
