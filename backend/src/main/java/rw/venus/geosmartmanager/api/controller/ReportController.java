package rw.venus.geosmartmanager.api.controller;

import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import rw.venus.geosmartmanager.api.dto.ReportDtos;
import rw.venus.geosmartmanager.entity.ReportEntity;
import rw.venus.geosmartmanager.service.ReportService;

import java.util.List;

@RestController
@RequestMapping("/api/projects/{projectId}/reports")
public class ReportController {
    private final ReportService reportService;

    public ReportController(ReportService reportService) {
        this.reportService = reportService;
    }

    @PostMapping("/generate")
    @PreAuthorize("hasAnyRole('ADMIN','PROJECT_MANAGER','ENGINEER','CIVIL_ENGINEER')")
    public ReportDtos.ReportResponse generate(@PathVariable Long projectId, @Valid @RequestBody ReportDtos.GenerateReportRequest request) {
        return toResponse(reportService.generate(projectId, request));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','PROJECT_MANAGER','SURVEYOR','ENGINEER','CIVIL_ENGINEER','CLIENT')")
    public List<ReportDtos.ReportResponse> list(@PathVariable Long projectId) {
        return reportService.listByProject(projectId).stream().map(this::toResponse).toList();
    }

    @GetMapping("/{reportId}/pdf")
    @PreAuthorize("hasAnyRole('ADMIN','PROJECT_MANAGER','SURVEYOR','ENGINEER','CIVIL_ENGINEER','CLIENT')")
    public ResponseEntity<byte[]> downloadPdf(@PathVariable Long projectId, @PathVariable Long reportId) {
        ReportEntity report = reportService.getReport(projectId, reportId);
        byte[] pdf = reportService.generatePdf(report);
        String filename = "GeoSmart-" + report.getProject().getCode() + "-" + report.getType() + "-Report.pdf";

        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .body(pdf);
    }

    private ReportDtos.ReportResponse toResponse(ReportEntity entity) {
        return new ReportDtos.ReportResponse(
                entity.getId(),
                entity.getProject().getId(),
                entity.getType(),
                entity.getContent()
        );
    }
}
