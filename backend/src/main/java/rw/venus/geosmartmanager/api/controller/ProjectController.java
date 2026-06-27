package rw.venus.geosmartmanager.api.controller;

import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import rw.venus.geosmartmanager.api.dto.PlannerDtos;
import rw.venus.geosmartmanager.api.dto.ProjectDtos;
import rw.venus.geosmartmanager.entity.ProjectEntity;
import rw.venus.geosmartmanager.service.ProjectService;
import rw.venus.geosmartmanager.service.ReportService;

import java.util.List;

@RestController
@RequestMapping("/api/projects")
public class ProjectController {
    private final ProjectService projectService;
    private final ReportService reportService;
    private final rw.venus.geosmartmanager.repo.UserRepository userRepository;

    public ProjectController(ProjectService projectService,
                             ReportService reportService,
                             rw.venus.geosmartmanager.repo.UserRepository userRepository) {
        this.projectService = projectService;
        this.reportService = reportService;
        this.userRepository = userRepository;
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','PROJECT_MANAGER','CLIENT')")
    public ProjectDtos.ProjectResponse create(@Valid @RequestBody ProjectDtos.ProjectRequest request) {
        return toResponse(projectService.create(request));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','PROJECT_MANAGER','SURVEYOR','ENGINEER','CIVIL_ENGINEER','CLIENT')")
    public List<ProjectDtos.ProjectResponse> list(@RequestParam(defaultValue = "false") boolean includeArchived) {
        return projectService.list(includeArchived).stream().map(this::toResponse).toList();
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','PROJECT_MANAGER')")
    public ProjectDtos.ProjectResponse update(@PathVariable Long id, @Valid @RequestBody ProjectDtos.ProjectRequest request) {
        return toResponse(projectService.update(id, request));
    }

    @PostMapping("/{id}/assign")
    @PreAuthorize("hasAnyRole('ADMIN','PROJECT_MANAGER')")
    public ProjectDtos.ProjectResponse assign(@PathVariable Long id, @RequestBody ProjectDtos.AssignmentRequest request) {
        return toResponse(projectService.assignSurveyor(id, request.surveyorId()));
    }

    @PostMapping("/{id}/approve")
    @PreAuthorize("hasAnyRole('ADMIN','PROJECT_MANAGER')")
    public ProjectDtos.ProjectResponse approve(@PathVariable Long id) {
        return toResponse(projectService.approveProject(id));
    }

    @PostMapping("/{id}/accept-assignment")
    @PreAuthorize("hasRole('SURVEYOR')")
    public ProjectDtos.ProjectResponse acceptAssignment(@PathVariable Long id) {
        return toResponse(projectService.acceptAssignment(id));
    }

    @PostMapping("/{id}/workflow/draft")
    @PreAuthorize("hasAnyRole('ADMIN','PROJECT_MANAGER','SURVEYOR')")
    public ProjectDtos.ProjectResponse recordDraft(@PathVariable Long id,
                                                   @RequestBody ProjectDtos.WorkflowDraftRequest request) {
        return toResponse(projectService.recordSubdivisionDraft(id, request.actualParcelCount(), request.proposedLandUse()));
    }

    @PostMapping("/{id}/workflow/compliance")
    @PreAuthorize("hasAnyRole('ADMIN','PROJECT_MANAGER','SURVEYOR')")
    public ProjectDtos.ProjectResponse recordCompliance(@PathVariable Long id,
                                                        @RequestBody ProjectDtos.WorkflowComplianceRequest request) {
        return toResponse(projectService.recordComplianceCheck(id, request.complianceScore(), request.recommendation()));
    }

    @PostMapping("/{id}/subdivision/report")
    @PreAuthorize("hasAnyRole('ADMIN','PROJECT_MANAGER','SURVEYOR')")
    public ProjectDtos.ProjectPlannerReportResponse generateSubdivisionProjectReport(@PathVariable Long id,
                                                                                     @Valid @RequestBody PlannerDtos.SubdivisionCheckRequest request) {
        return reportService.generatePlannerReportForProject(id, request);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','PROJECT_MANAGER')")
    public void delete(@PathVariable Long id) {
        projectService.delete(id);
    }

    @PostMapping("/{id}/archive")
    @PreAuthorize("hasAnyRole('ADMIN','PROJECT_MANAGER')")
    public ProjectDtos.ProjectResponse archive(@PathVariable Long id) {
        return toResponse(projectService.archive(id));
    }

    @PostMapping("/{id}/restore")
    @PreAuthorize("hasAnyRole('ADMIN','PROJECT_MANAGER')")
    public ProjectDtos.ProjectResponse restore(@PathVariable Long id) {
        return toResponse(projectService.restore(id));
    }

    private ProjectDtos.ProjectResponse toResponse(ProjectEntity entity) {
        ProjectService.ProjectWorkflowSnapshot workflow = projectService.workflowSnapshot(entity.getId());
        String surveyorName = entity.getAssignedSurveyorId() != null
                ? userRepository.findById(entity.getAssignedSurveyorId()).map(rw.venus.geosmartmanager.entity.UserEntity::getFullName).orElse(null)
                : null;

        return new ProjectDtos.ProjectResponse(
                entity.getId(),
                entity.getCode(),
                entity.getName(),
                entity.getProjectType(),
                entity.getLocationSummary(),
                entity.getScopeSummary(),
                entity.getDescription(),
                entity.getStatus(),
                entity.getStartDate(),
                entity.getEndDate(),
                entity.getClient().getId(),
                entity.getClient().getName(),
                entity.getArchivedAt() != null,
                entity.getArchivedAt(),
                projectService.documentCount(entity.getId()),
                projectService.communicationCount(entity.getId()),
                workflow.stage(),
                workflow.nextAction(),
                workflow.readinessPercent(),
                entity.getAssignedSurveyorId(),
                surveyorName,
                entity.getRequestedUpi(),
                entity.getRequestedParcelCount(),
                entity.getRequestedLandUse(),
                entity.getIntakeNotes(),
                entity.getApprovedAt(),
                entity.getSurveyorAcceptedAt(),
                entity.getSubdivisionDraftedAt(),
                entity.getComplianceCheckedAt(),
                entity.getReportReadyAt()
        );
    }
}
