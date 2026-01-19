package rw.venus.geosmartmanager.api.controller;

import rw.venus.geosmartmanager.api.dto.ReportDtos;
import rw.venus.geosmartmanager.entity.ReportEntity;
import rw.venus.geosmartmanager.service.CurrentUserService;
import rw.venus.geosmartmanager.service.ReportService;
import jakarta.validation.Valid;
import java.nio.file.Path;
import java.util.List;
import java.util.UUID;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class ReportController {
    private final ReportService reportService;
    private final CurrentUserService currentUserService;

    public ReportController(ReportService reportService, CurrentUserService currentUserService) {
        this.reportService = reportService;
        this.currentUserService = currentUserService;
    }

    @PostMapping("/projects/{projectId}/reports/generate")
    public ReportDtos.ReportDto generate(@PathVariable UUID projectId, @Valid @RequestBody ReportDtos.GenerateReportRequest req) {
        return reportService.generate(currentUserService.requireCurrentUser(), projectId, req);
    }

    @GetMapping("/projects/{projectId}/reports")
    public List<ReportDtos.ReportDto> list(@PathVariable UUID projectId) {
        return reportService.list(currentUserService.requireCurrentUser(), projectId);
    }

    @GetMapping("/reports/{reportId}/download")
    public ResponseEntity<Resource> download(@PathVariable UUID reportId) {
        ReportEntity report = reportService.requireAccessible(currentUserService.requireCurrentUser(), reportId);
        Path path = reportService.resolvePath(report);
        Resource resource = new FileSystemResource(path);
        String filename = "report-" + report.getType().name().toLowerCase() + ".pdf";
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(MediaType.APPLICATION_PDF)
                .body(resource);
    }
}
