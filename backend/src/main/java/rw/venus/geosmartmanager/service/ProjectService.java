package rw.venus.geosmartmanager.service;

import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import rw.venus.geosmartmanager.api.dto.ProjectDtos;
import rw.venus.geosmartmanager.domain.KycStatus;
import rw.venus.geosmartmanager.domain.ProjectCommunicationChannel;
import rw.venus.geosmartmanager.domain.ProjectStatus;
import rw.venus.geosmartmanager.domain.Role;
import rw.venus.geosmartmanager.domain.UserStatus;
import rw.venus.geosmartmanager.domain.WorkflowStatus;
import rw.venus.geosmartmanager.entity.ClientEntity;
import rw.venus.geosmartmanager.entity.ProjectCommunicationEntity;
import rw.venus.geosmartmanager.entity.ProjectEntity;
import rw.venus.geosmartmanager.entity.UserEntity;
import rw.venus.geosmartmanager.repo.ClientRepository;
import rw.venus.geosmartmanager.repo.ComplianceCheckRepository;
import rw.venus.geosmartmanager.repo.DatasetRepository;
import rw.venus.geosmartmanager.repo.ProjectCommunicationRepository;
import rw.venus.geosmartmanager.repo.ProjectDocumentRepository;
import rw.venus.geosmartmanager.repo.ProjectRepository;
import rw.venus.geosmartmanager.repo.ReportRepository;
import rw.venus.geosmartmanager.repo.SubdivisionRunRepository;
import rw.venus.geosmartmanager.repo.UserRepository;
import rw.venus.geosmartmanager.repo.WorkflowTaskRepository;

import java.time.Instant;
import java.util.EnumSet;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;

@Service
public class ProjectService {
    private static final Set<ProjectStatus> REPORT_READY_STATUSES = EnumSet.of(ProjectStatus.REPORT_GENERATED, ProjectStatus.COMPLETED);

    private final ProjectRepository projectRepository;
    private final ClientRepository clientRepository;
    private final DatasetRepository datasetRepository;
    private final SubdivisionRunRepository subdivisionRunRepository;
    private final ComplianceCheckRepository complianceCheckRepository;
    private final ReportRepository reportRepository;
    private final WorkflowTaskRepository workflowTaskRepository;
    private final ProjectDocumentRepository projectDocumentRepository;
    private final ProjectCommunicationRepository projectCommunicationRepository;
    private final AuditService auditService;
    private final CurrentUserService currentUserService;
    private final NotificationService notificationService;
    private final UserRepository userRepository;
    private final EmailNotificationService emailNotificationService;

    public ProjectService(ProjectRepository projectRepository,
                          ClientRepository clientRepository,
                          DatasetRepository datasetRepository,
                          SubdivisionRunRepository subdivisionRunRepository,
                          ComplianceCheckRepository complianceCheckRepository,
                          ReportRepository reportRepository,
                          WorkflowTaskRepository workflowTaskRepository,
                          ProjectDocumentRepository projectDocumentRepository,
                          ProjectCommunicationRepository projectCommunicationRepository,
                          AuditService auditService,
                          CurrentUserService currentUserService,
                          NotificationService notificationService,
                          UserRepository userRepository,
                          EmailNotificationService emailNotificationService) {
        this.projectRepository = projectRepository;
        this.clientRepository = clientRepository;
        this.datasetRepository = datasetRepository;
        this.subdivisionRunRepository = subdivisionRunRepository;
        this.complianceCheckRepository = complianceCheckRepository;
        this.reportRepository = reportRepository;
        this.workflowTaskRepository = workflowTaskRepository;
        this.projectDocumentRepository = projectDocumentRepository;
        this.projectCommunicationRepository = projectCommunicationRepository;
        this.auditService = auditService;
        this.currentUserService = currentUserService;
        this.notificationService = notificationService;
        this.userRepository = userRepository;
        this.emailNotificationService = emailNotificationService;
    }

    @Transactional
    public ProjectEntity create(ProjectDtos.ProjectRequest request) {
        UserEntity currentUser = currentUserService.getCurrentUser();
        validateClientIntake(request, currentUser);

        ClientEntity client = resolveClientForCreate(request, currentUser);
        ProjectStatus status = resolveInitialStatus(request, currentUser);
        ProjectEntity entity = ProjectEntity.builder()
                .code(resolveProjectCode(request.code()))
                .name(request.name().trim())
                .projectType(normalizeOptional(request.projectType()) != null ? normalizeOptional(request.projectType()) : "Land Subdivision")
                .locationSummary(normalizeOptional(request.locationSummary()))
                .scopeSummary(normalizeOptional(request.scopeSummary()))
                .description(normalizeOptional(request.description()))
                .status(status)
                .startDate(request.startDate())
                .endDate(request.endDate())
                .client(client)
                .requestedUpi(normalizeUpi(request.requestedUpi()))
                .requestedParcelCount(normalizeParcelCount(request.requestedParcelCount()))
                .requestedLandUse(normalizeOptional(request.requestedLandUse()))
                .intakeNotes(normalizeOptional(request.intakeNotes()))
                .createdAt(Instant.now())
                .build();
        projectRepository.save(entity);

        String submissionSummary = buildSubmissionSummary(entity);
        recordSystemCommunication(entity, "Project submitted", submissionSummary);

        adminUsers().forEach(admin -> {
            notificationService.create(
                    admin.getId(),
                    "New Project Submitted",
                    "A new project has been submitted: " + entity.getName(),
                    "INFO",
                    entity.getId()
            );
            emailNotificationService.notifyNewProject(admin.getEmail(), entity.getName());
        });

        auditService.log(currentUserService.getCurrentUserEmail(), "CREATE", "Project", entity.getId(), "Project created");
        return entity;
    }

    public List<ProjectEntity> list(boolean includeArchived) {
        return visibleProjectsForCurrentUser().stream()
                .filter(project -> includeArchived || project.getArchivedAt() == null)
                .toList();
    }

    @Transactional
    public ProjectEntity update(Long id, ProjectDtos.ProjectRequest request) {
        ProjectEntity entity = getProject(id);
        ClientEntity client = resolveClientById(request.clientId());
        ProjectStatus oldStatus = entity.getStatus();

        entity.setCode(resolveProjectCode(request.code(), entity.getCode()));
        entity.setName(request.name().trim());
        entity.setProjectType(normalizeOptional(request.projectType()));
        entity.setLocationSummary(normalizeOptional(request.locationSummary()));
        entity.setScopeSummary(normalizeOptional(request.scopeSummary()));
        entity.setDescription(normalizeOptional(request.description()));
        entity.setStatus(request.status() != null ? request.status() : entity.getStatus());
        entity.setStartDate(request.startDate());
        entity.setEndDate(request.endDate());
        entity.setClient(client);
        entity.setRequestedUpi(normalizeUpi(request.requestedUpi()));
        entity.setRequestedParcelCount(normalizeParcelCount(request.requestedParcelCount()));
        entity.setRequestedLandUse(normalizeOptional(request.requestedLandUse()));
        entity.setIntakeNotes(normalizeOptional(request.intakeNotes()));

        if (entity.getStatus() == ProjectStatus.PENDING_ASSIGNMENT && entity.getApprovedAt() == null) {
            entity.setApprovedAt(Instant.now());
        }

        projectRepository.save(entity);
        notifyStatusChangeIfNeeded(entity, oldStatus);
        auditService.log(currentUserService.getCurrentUserEmail(), "UPDATE", "Project", entity.getId(), "Project updated");
        return entity;
    }

    @Transactional
    public ProjectEntity approveProject(Long id) {
        ProjectEntity project = getActiveProject(id);

        if (project.getApprovedAt() == null) {
            project.setApprovedAt(Instant.now());
        }
        if (statusRank(project.getStatus()) < statusRank(ProjectStatus.PENDING_ASSIGNMENT)) {
            project.setStatus(ProjectStatus.PENDING_ASSIGNMENT);
        }
        projectRepository.save(project);

        recordSystemCommunication(project, "Project approved", "The intake request has been approved and is ready for surveyor assignment.");
        notifyClient(project, "Project Approved", "Your project '" + project.getName() + "' has been approved and is awaiting surveyor assignment.");
        auditService.log(currentUserService.getCurrentUserEmail(), "APPROVE", "Project", project.getId(), "Project approved");
        return project;
    }

    @Transactional
    public ProjectEntity assignSurveyor(Long projectId, Long surveyorId) {
        ProjectEntity project = getActiveProject(projectId);

        if (surveyorId == null || surveyorId <= 0) {
            project.setAssignedSurveyorId(null);
            project.setSurveyorAcceptedAt(null);
            if (statusRank(project.getStatus()) <= statusRank(ProjectStatus.ASSIGNED)) {
                project.setStatus(ProjectStatus.PENDING_ASSIGNMENT);
            }
            projectRepository.save(project);
            recordSystemCommunication(project, "Surveyor unassigned", "The project was returned to the assignment queue.");
            auditService.log(currentUserService.getCurrentUserEmail(), "UNASSIGN", "Project", projectId, "Project unassigned from surveyor");
            return project;
        }

        UserEntity surveyor = userRepository.findById(surveyorId)
                .orElseThrow(() -> new IllegalArgumentException("Surveyor not found"));
        if (surveyor.getRole() != Role.SURVEYOR) {
            throw new IllegalArgumentException("Selected user is not a land surveyor");
        }
        if (surveyor.getStatus() == UserStatus.SUSPENDED) {
            throw new IllegalArgumentException("Selected surveyor is suspended");
        }

        if (project.getApprovedAt() == null) {
            project.setApprovedAt(Instant.now());
        }
        if (!Objects.equals(project.getAssignedSurveyorId(), surveyorId)) {
            project.setSurveyorAcceptedAt(null);
        }
        project.setAssignedSurveyorId(surveyorId);
        advanceStatus(project, ProjectStatus.ASSIGNED);
        projectRepository.save(project);

        notificationService.create(
                surveyorId,
                "New Project Assignment",
                "You have been assigned to project: " + project.getName(),
                "INFO",
                projectId
        );
        emailNotificationService.notifyProjectAssigned(surveyor.getEmail(), project.getName());
        notifyClient(project, "Surveyor Assigned", "A land surveyor has been assigned to your project '" + project.getName() + "'.");
        recordSystemCommunication(project, "Surveyor assigned", surveyor.getFullName() + " was assigned to this project.");
        auditService.log(currentUserService.getCurrentUserEmail(), "ASSIGN", "Project", projectId, "Project assigned to surveyor " + surveyor.getFullName());
        return project;
    }

    @Transactional
    public ProjectEntity acceptAssignment(Long projectId) {
        ProjectEntity project = getActiveProject(projectId);
        UserEntity currentUser = currentUserService.getCurrentUser();
        if (currentUser == null || currentUser.getRole() != Role.SURVEYOR) {
            throw new AccessDeniedException("Only the assigned land surveyor can accept this project.");
        }
        if (!Objects.equals(project.getAssignedSurveyorId(), currentUser.getId())) {
            throw new AccessDeniedException("You are not assigned to this project.");
        }

        if (project.getApprovedAt() == null) {
            project.setApprovedAt(Instant.now());
        }
        if (project.getSurveyorAcceptedAt() == null) {
            project.setSurveyorAcceptedAt(Instant.now());
        }
        advanceStatus(project, ProjectStatus.UNDER_REVIEW);
        projectRepository.save(project);

        String summary = currentUser.getFullName() + " accepted the assignment and can proceed with subdivision review.";
        recordSystemCommunication(project, "Surveyor accepted assignment", summary);
        notifyAdmins("Surveyor Accepted Project", summary, project.getId());
        notifyClient(project, "Project Under Review", "Your project '" + project.getName() + "' has been accepted by the assigned land surveyor.");
        auditService.log(currentUserService.getCurrentUserEmail(), "ACCEPT_ASSIGNMENT", "Project", projectId, "Assigned surveyor accepted project");
        return project;
    }

    @Transactional
    public ProjectEntity recordSubdivisionDraft(Long projectId, Integer actualParcelCount, String proposedLandUse) {
        ProjectEntity project = getActiveProject(projectId);

        if (actualParcelCount != null && actualParcelCount > 0) {
            project.setRequestedParcelCount(actualParcelCount);
        }
        if (normalizeOptional(proposedLandUse) != null) {
            project.setRequestedLandUse(normalizeOptional(proposedLandUse));
        }
        project.setSubdivisionDraftedAt(Instant.now());
        advanceStatus(project, ProjectStatus.SUBDIVISION_REVIEW);
        projectRepository.save(project);

        String summary = "A subdivision draft was prepared"
                + (project.getRequestedParcelCount() != null ? " for " + project.getRequestedParcelCount() + " plots" : "")
                + ".";
        recordSystemCommunication(project, "Subdivision draft created", summary);
        auditService.log(currentUserService.getCurrentUserEmail(), "DRAFT_SUBDIVISION", "Project", projectId, "Subdivision draft recorded");
        return project;
    }

    @Transactional
    public ProjectEntity recordComplianceCheck(Long projectId, Integer complianceScore, String recommendation) {
        ProjectEntity project = getActiveProject(projectId);

        project.setComplianceCheckedAt(Instant.now());
        if (complianceScore != null && complianceScore >= 70) {
            advanceStatus(project, ProjectStatus.DOCUMENTS_ACCEPTED);
        } else if (complianceScore != null) {
            project.setStatus(ProjectStatus.NEEDS_MORE_INFO);
        } else {
            advanceStatus(project, ProjectStatus.SUBDIVISION_REVIEW);
        }
        projectRepository.save(project);

        String summary = "Compliance review completed"
                + (complianceScore != null ? " with score " + complianceScore + "/100" : "")
                + (normalizeOptional(recommendation) != null ? " and recommendation " + normalizeOptional(recommendation) + "." : ".");
        recordSystemCommunication(project, "Compliance review completed", summary);
        auditService.log(currentUserService.getCurrentUserEmail(), "COMPLIANCE_REVIEW", "Project", projectId, "Compliance review recorded");
        return project;
    }

    @Transactional
    public ProjectEntity markPlannerReportReady(Long projectId) {
        ProjectEntity project = getActiveProject(projectId);

        project.setReportReadyAt(Instant.now());
        project.setStatus(ProjectStatus.REPORT_GENERATED);
        projectRepository.save(project);

        recordSystemCommunication(project, "Project report generated", "The subdivision compliance report is ready in the project reports library for client download.");
        notifyClient(project, "Project Report Ready", "Your project report for '" + project.getName() + "' is ready for download.");
        if (project.getAssignedSurveyorId() != null) {
            notificationService.create(
                    project.getAssignedSurveyorId(),
                    "Project Report Ready",
                    "The project report for '" + project.getName() + "' has been generated.",
                    "SUCCESS",
                    projectId
            );
        }
        auditService.log(currentUserService.getCurrentUserEmail(), "REPORT_READY", "Project", projectId, "Project report generated");
        return project;
    }

    public ProjectEntity archive(Long id) {
        ProjectEntity entity = getProject(id);
        if (entity.getArchivedAt() == null) {
            entity.setArchivedAt(Instant.now());
            projectRepository.save(entity);
            auditService.log(currentUserService.getCurrentUserEmail(), "ARCHIVE", "Project", entity.getId(), "Project archived");
        }
        return entity;
    }

    public ProjectEntity restore(Long id) {
        ProjectEntity entity = getProject(id);
        if (entity.getArchivedAt() != null) {
            entity.setArchivedAt(null);
            projectRepository.save(entity);
            auditService.log(currentUserService.getCurrentUserEmail(), "RESTORE", "Project", entity.getId(), "Project restored");
        }
        return entity;
    }

    public void delete(Long id) {
        ProjectEntity entity = getProject(id);
        projectRepository.delete(entity);
        auditService.log(currentUserService.getCurrentUserEmail(), "DELETE", "Project", id, "Project deleted");
    }

    public ProjectEntity getProject(Long id) {
        ProjectEntity project = findProjectOrThrow(id);
        ensureProjectAccess(project);
        return project;
    }

    public ProjectEntity getActiveProject(Long id) {
        ProjectEntity project = getProject(id);
        if (project.getArchivedAt() != null) {
            throw new IllegalArgumentException("Project is archived. Restore it before adding new records.");
        }
        return project;
    }

    public long documentCount(Long projectId) {
        return projectDocumentRepository.countByProjectId(projectId);
    }

    public long communicationCount(Long projectId) {
        return projectCommunicationRepository.countByProjectId(projectId);
    }

    public ProjectWorkflowSnapshot workflowSnapshot(Long projectId) {
        ProjectEntity project = getProject(projectId);
        if (project.getArchivedAt() != null) {
            return new ProjectWorkflowSnapshot("ARCHIVED", "Restore project to resume delivery", 100);
        }
        if (project.getStatus() == ProjectStatus.CANCELLED) {
            return new ProjectWorkflowSnapshot("CANCELLED", "Project was cancelled", 0);
        }

        long openTasks = workflowTaskRepository.countByProjectIdAndStatusNot(projectId, WorkflowStatus.DONE);
        boolean approved = project.getApprovedAt() != null || statusRank(project.getStatus()) >= statusRank(ProjectStatus.PENDING_ASSIGNMENT);
        boolean assigned = project.getAssignedSurveyorId() != null || statusRank(project.getStatus()) >= statusRank(ProjectStatus.ASSIGNED);
        boolean accepted = project.getSurveyorAcceptedAt() != null || statusRank(project.getStatus()) >= statusRank(ProjectStatus.UNDER_REVIEW);
        boolean drafted = project.getSubdivisionDraftedAt() != null || subdivisionRunRepository.countByProjectId(projectId) > 0 || statusRank(project.getStatus()) >= statusRank(ProjectStatus.SUBDIVISION_REVIEW);
        boolean complianceReviewed = project.getComplianceCheckedAt() != null
                || complianceCheckRepository.countByProjectId(projectId) > 0
                || project.getStatus() == ProjectStatus.DOCUMENTS_ACCEPTED
                || project.getStatus() == ProjectStatus.NEEDS_MORE_INFO
                || REPORT_READY_STATUSES.contains(project.getStatus());
        boolean reportReady = project.getReportReadyAt() != null
                || reportRepository.countByProjectId(projectId) > 0
                || REPORT_READY_STATUSES.contains(project.getStatus());

        if (reportReady) {
            complianceReviewed = true;
            drafted = true;
            accepted = true;
            assigned = true;
            approved = true;
        } else if (complianceReviewed) {
            drafted = true;
            accepted = true;
            assigned = true;
            approved = true;
        } else if (drafted) {
            accepted = true;
            assigned = true;
            approved = true;
        } else if (accepted) {
            assigned = true;
            approved = true;
        } else if (assigned) {
            approved = true;
        }

        int readinessPercent = 10;
        if (approved) readinessPercent = 20;
        if (assigned) readinessPercent = 35;
        if (accepted) readinessPercent = 50;
        if (drafted) readinessPercent = 68;
        if (complianceReviewed) readinessPercent = 84;
        if (reportReady) readinessPercent = 100;

        if (!approved) {
            return new ProjectWorkflowSnapshot("INTAKE_APPROVAL", "Review the client request and approve intake", readinessPercent);
        }
        if (!assigned) {
            return new ProjectWorkflowSnapshot("SURVEYOR_ASSIGNMENT", "Assign the project to a land surveyor", readinessPercent);
        }
        if (!accepted) {
            return new ProjectWorkflowSnapshot("SURVEYOR_CONFIRMATION", "Await surveyor acceptance before drafting", readinessPercent);
        }
        if (!drafted) {
            return new ProjectWorkflowSnapshot("SUBDIVISION_DRAFT", "Generate a subdivision draft from the requested UPI", readinessPercent);
        }
        if (project.getStatus() == ProjectStatus.NEEDS_MORE_INFO && !reportReady) {
            return new ProjectWorkflowSnapshot("CLIENT_REVISION", "Adjust the draft and rerun compliance", readinessPercent);
        }
        if (!complianceReviewed) {
            return new ProjectWorkflowSnapshot("COMPLIANCE_VALIDATION", "Run the compliance check on the drafted plots", readinessPercent);
        }
        if (!reportReady) {
            return new ProjectWorkflowSnapshot("REPORT_DELIVERY", "Generate the client-facing project report", readinessPercent);
        }
        if (openTasks > 0) {
            return new ProjectWorkflowSnapshot("WORKFLOW_CLOSURE", "Close " + openTasks + " remaining workflow task(s)", readinessPercent);
        }
        return new ProjectWorkflowSnapshot("READY_FOR_SUBMISSION", "Client dossier is ready for download", 100);
    }

    public record ProjectWorkflowSnapshot(
            String stage,
            String nextAction,
            int readinessPercent
    ) {}

    private ProjectEntity findProjectOrThrow(Long id) {
        return projectRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Project not found"));
    }

    private List<ProjectEntity> visibleProjectsForCurrentUser() {
        UserEntity currentUser = currentUserService.getCurrentUser();
        if (currentUser == null || currentUser.getRole() == null) {
            return projectRepository.findAll();
        }

        return switch (currentUser.getRole()) {
            case ADMIN, PROJECT_MANAGER, ENGINEER, CIVIL_ENGINEER -> projectRepository.findAll();
            case SURVEYOR -> projectRepository.findByAssignedSurveyorId(currentUser.getId());
            case CLIENT -> {
                ClientEntity client = resolveCurrentClientProfile(currentUser, false);
                yield client == null ? List.of() : projectRepository.findByClientId(client.getId());
            }
        };
    }

    private void ensureProjectAccess(ProjectEntity project) {
        UserEntity currentUser = currentUserService.getCurrentUser();
        if (currentUser == null || currentUser.getRole() == null) {
            return;
        }

        switch (currentUser.getRole()) {
            case ADMIN, PROJECT_MANAGER, ENGINEER, CIVIL_ENGINEER -> {
                return;
            }
            case SURVEYOR -> {
                if (project.getAssignedSurveyorId() != null && project.getAssignedSurveyorId().equals(currentUser.getId())) {
                    return;
                }
            }
            case CLIENT -> {
                ClientEntity client = resolveCurrentClientProfile(currentUser, false);
                if (client != null && project.getClient() != null && project.getClient().getId().equals(client.getId())) {
                    return;
                }
            }
        }

        throw new AccessDeniedException("You do not have access to this project");
    }

    private ClientEntity resolveClientForCreate(ProjectDtos.ProjectRequest request, UserEntity currentUser) {
        if (currentUser != null && currentUser.getRole() == Role.CLIENT) {
            return resolveCurrentClientProfile(currentUser, true);
        }
        return resolveClientById(request.clientId());
    }

    private ClientEntity resolveClientById(Long clientId) {
        if (clientId == null) {
            throw new IllegalArgumentException("Client is required");
        }
        return clientRepository.findById(clientId)
                .orElseThrow(() -> new IllegalArgumentException("Client not found"));
    }

    private ClientEntity resolveCurrentClientProfile(UserEntity currentUser, boolean createIfMissing) {
        if (currentUser == null || currentUser.getRole() != Role.CLIENT) {
            return null;
        }

        ClientEntity existing = clientRepository.findByUserId(currentUser.getId()).orElse(null);
        if (existing != null) {
            return existing;
        }

        if (!createIfMissing) {
            return null;
        }

        ClientEntity client = ClientEntity.builder()
                .name(currentUser.getFullName())
                .contactEmail(currentUser.getEmail())
                .kycStatus(KycStatus.PENDING)
                .userId(currentUser.getId())
                .createdAt(Instant.now())
                .build();
        return clientRepository.save(client);
    }

    private ProjectStatus resolveInitialStatus(ProjectDtos.ProjectRequest request, UserEntity currentUser) {
        if (currentUser != null && currentUser.getRole() == Role.CLIENT) {
            return ProjectStatus.SUBMITTED;
        }
        return request.status() != null ? request.status() : ProjectStatus.SUBMITTED;
    }

    private void validateClientIntake(ProjectDtos.ProjectRequest request, UserEntity currentUser) {
        if (currentUser == null || currentUser.getRole() != Role.CLIENT) {
            return;
        }
        if (normalizeUpi(request.requestedUpi()) == null) {
            throw new IllegalArgumentException("Land UPI is required for client project intake.");
        }
        Integer requestedParcelCount = normalizeParcelCount(request.requestedParcelCount());
        if (requestedParcelCount == null || requestedParcelCount < 1) {
            throw new IllegalArgumentException("Requested parcel count is required for client project intake.");
        }
    }

    private String resolveProjectCode(String requestedCode) {
        return resolveProjectCode(requestedCode, null);
    }

    private String resolveProjectCode(String requestedCode, String fallback) {
        String normalized = normalizeOptional(requestedCode);
        if (normalized != null) {
            return normalized.toUpperCase(Locale.ROOT);
        }
        if (fallback != null && !fallback.isBlank()) {
            return fallback;
        }
        String suffix = UUID.randomUUID().toString().substring(0, 6).toUpperCase(Locale.ROOT);
        return "GS-" + Instant.now().toString().substring(0, 10).replace("-", "") + "-" + suffix;
    }

    private Integer normalizeParcelCount(Integer value) {
        if (value == null) {
            return null;
        }
        if (value <= 0) {
            throw new IllegalArgumentException("Requested parcel count must be greater than zero.");
        }
        return value;
    }

    private String normalizeUpi(String value) {
        String normalized = normalizeOptional(value);
        return normalized != null ? normalized.toUpperCase(Locale.ROOT) : null;
    }

    private String normalizeOptional(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private void notifyClient(ProjectEntity project, String title, String message) {
        Long clientRecipientId = project.getClient() != null ? project.getClient().getUserId() : null;
        if (clientRecipientId != null) {
            notificationService.create(clientRecipientId, title, message, "INFO", project.getId());
        }
        if (project.getClient() != null && project.getClient().getContactEmail() != null) {
            emailNotificationService.notifyStatusChanged(project.getClient().getContactEmail(), project.getName(), project.getStatus().name());
        }
    }

    private void notifyAdmins(String title, String message, Long projectId) {
        adminUsers().forEach(admin -> notificationService.create(admin.getId(), title, message, "INFO", projectId));
    }

    private List<UserEntity> adminUsers() {
        return userRepository.findAll().stream()
                .filter(user -> user.getRole() == Role.ADMIN || user.getRole() == Role.PROJECT_MANAGER)
                .toList();
    }

    private void notifyStatusChangeIfNeeded(ProjectEntity entity, ProjectStatus oldStatus) {
        if (oldStatus == entity.getStatus()) {
            return;
        }

        Long clientRecipientId = entity.getClient() != null ? entity.getClient().getUserId() : null;
        if (clientRecipientId != null) {
            notificationService.create(
                    clientRecipientId,
                    "Project Status Updated",
                    "Your project '" + entity.getName() + "' is now: " + entity.getStatus(),
                    "INFO",
                    entity.getId()
            );
        }
        if (entity.getClient() != null && entity.getClient().getContactEmail() != null) {
            emailNotificationService.notifyStatusChanged(entity.getClient().getContactEmail(), entity.getName(), entity.getStatus().name());
        }
        if (entity.getAssignedSurveyorId() != null) {
            notificationService.create(
                    entity.getAssignedSurveyorId(),
                    "Project Status Updated",
                    "Project '" + entity.getName() + "' status changed to " + entity.getStatus(),
                    "INFO",
                    entity.getId()
            );
            userRepository.findById(entity.getAssignedSurveyorId()).ifPresent(surveyor ->
                    emailNotificationService.notifyStatusChanged(surveyor.getEmail(), entity.getName(), entity.getStatus().name()));
        }
    }

    private void recordSystemCommunication(ProjectEntity project, String subject, String summary) {
        projectCommunicationRepository.save(ProjectCommunicationEntity.builder()
                .project(project)
                .channel(ProjectCommunicationChannel.NOTE)
                .subject(subject)
                .contactPerson("GeoSmart Workflow")
                .senderUserId(null)
                .senderName("GeoSmart Workflow")
                .senderRole("SYSTEM")
                .summary(summary)
                .systemGenerated(true)
                .occurredAt(Instant.now())
                .createdAt(Instant.now())
                .build());
    }

    private String buildSubmissionSummary(ProjectEntity entity) {
        StringBuilder builder = new StringBuilder("A new project intake was submitted");
        if (entity.getRequestedUpi() != null) {
            builder.append(" for UPI ").append(entity.getRequestedUpi());
        }
        if (entity.getRequestedParcelCount() != null) {
            builder.append(" requesting ").append(entity.getRequestedParcelCount()).append(" parcels");
        }
        builder.append(".");
        return builder.toString();
    }

    private void advanceStatus(ProjectEntity project, ProjectStatus targetStatus) {
        if (statusRank(targetStatus) > statusRank(project.getStatus())) {
            project.setStatus(targetStatus);
        }
    }

    private int statusRank(ProjectStatus status) {
        if (status == null) {
            return 0;
        }
        return switch (status) {
            case SUBMITTED -> 10;
            case PENDING_ASSIGNMENT -> 20;
            case ASSIGNED -> 30;
            case UNDER_REVIEW -> 40;
            case SUBDIVISION_REVIEW -> 50;
            case NEEDS_MORE_INFO -> 55;
            case DOCUMENTS_ACCEPTED -> 60;
            case REPORT_GENERATED -> 70;
            case COMPLETED -> 80;
            case CANCELLED -> -1;
            case PLANNING -> 15;
            case IN_PROGRESS -> 45;
            case REVIEW -> 55;
            case APPROVED -> 65;
        };
    }
}
