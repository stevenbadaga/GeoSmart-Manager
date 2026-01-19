package rw.venus.geosmartmanager.api.controller;

import rw.venus.geosmartmanager.service.DashboardService;
import rw.venus.geosmartmanager.service.CurrentUserService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/dashboard")
public class DashboardController {
    private final DashboardService dashboardService;
    private final CurrentUserService currentUserService;

    public DashboardController(DashboardService dashboardService, CurrentUserService currentUserService) {
        this.dashboardService = dashboardService;
        this.currentUserService = currentUserService;
    }

    @GetMapping("/summary")
    public DashboardService.Summary summary() {
        return dashboardService.summary(currentUserService.requireCurrentUser());
    }
}
