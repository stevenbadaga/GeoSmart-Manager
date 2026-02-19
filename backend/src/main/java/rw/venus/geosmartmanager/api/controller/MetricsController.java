package rw.venus.geosmartmanager.api.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.security.access.prepost.PreAuthorize;
import rw.venus.geosmartmanager.api.dto.MetricsDtos;
import rw.venus.geosmartmanager.service.MetricsService;

@RestController
@RequestMapping("/api/metrics")
public class MetricsController {
    private final MetricsService metricsService;

    public MetricsController(MetricsService metricsService) {
        this.metricsService = metricsService;
    }

    @GetMapping("/overview")
    @PreAuthorize("hasAnyRole('ADMIN','PROJECT_MANAGER','SURVEYOR','ENGINEER','CIVIL_ENGINEER','CLIENT')")
    public MetricsDtos.OverviewResponse overview() {
        return metricsService.overview();
    }
}
