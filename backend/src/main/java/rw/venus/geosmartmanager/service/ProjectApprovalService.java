package rw.venus.geosmartmanager.service;

import rw.venus.geosmartmanager.api.dto.CollaborationDtos;
import rw.venus.geosmartmanager.domain.ApprovalScope;
import rw.venus.geosmartmanager.domain.ApprovalStatus;
import rw.venus.geosmartmanager.domain.ApprovalTargetType;
import rw.venus.geosmartmanager.domain.UserRole;
import rw.venus.geosmartmanager.entity.ProjectApprovalEntity;
import rw.venus.geosmartmanager.entity.ProjectEntity;
import rw.venus.geosmartmanager.entity.SubdivisionRunEntity;
import rw.venus.geosmartmanager.entity.UserEntity;
import rw.venus.geosmartmanager.exception.ApiException;
import rw.venus.geosmartmanager.repo.ProjectApprovalRepository;
import rw.venus.geosmartmanager.repo.ProjectDocumentRepository;
import rw.venus.geosmartmanager.repo.ProjectRepository;
import rw.venus.geosmartmanager.repo.SubdivisionRunRepository;
import rw.venus.geosmartmanager.repo.UserRepository;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ProjectApprovalService {
    private final ProjectRepository projectRepository;
    private final ProjectApprovalRepository projectApprovalRepository;
    private final ProjectDocumentRepository projectDocumentRepository;
    private final SubdivisionRunRepository subdivisionRunRepository;
    private final ProjectAccessService projectAccessService;
    private final NotificationService notificationService;
    private final UserRepository userRepository;
    private final AuditService auditService;

    public ProjectApprovalService(
            ProjectRepository projectRepository,
            ProjectApprovalRepository projectApprovalRepository,
            ProjectDocumentRepository projectDocumentRepository,
            SubdivisionRunRepository subdivisionRunRepository,
            ProjectAccessService projectAccessService,
            NotificationService notificationService,
            UserRepository userRepository,
            AuditService auditService
    ) {
        this.projectRepository = projectRepository;
        this.projectApprovalRepository = projectApprovalRepository;
        this.projectDocumentRepository = projectDocumentRepository;
        this.subdivisionRunRepository = subdivisionRunRepository;
        this.projectAccessService = projectAccessService;
        this.notificationService = notificationService;
        this.userRepository = userRepository;
        this.auditService = auditService;
    }

    @Transactional(readOnly = true)
    public List<CollaborationDtos.ApprovalDto> list(UserEntity actor, UUID projectId) {
        projectAccessService.requireProjectRead(actor, projectId);
        return projectApprovalRepository.findByProjectIdOrderByCreatedAtDesc(projectId)
                .stream()
                .map(this::toDto)
                .toList();
    }

    @Transactional
    public CollaborationDtos.ApprovalDto request(UserEntity actor, UUID projectId, CollaborationDtos.RequestApprovalRequest req) {
        projectAccessService.requireProjectWrite(actor, projectId);

        ProjectEntity project = projectRepository.findById(projectId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Project not found"));

        requireValidTarget(projectId, req.targetType(), req.targetId());

        ProjectApprovalEntity approval = new ProjectApprovalEntity();
        approval.setProject(project);
        approval.setScope(req.scope());
        approval.setTargetType(req.targetType());
        approval.setTargetId(req.targetId());
        approval.setStatus(ApprovalStatus.PENDING);
        approval.setRequestNote(req.requestNote());
        approval.setRequestedBy(actor);

        ProjectApprovalEntity saved = projectApprovalRepository.save(approval);
        auditService.log(actor, "PROJECT_APPROVAL_REQUESTED", "ProjectApproval", saved.getId());

        if (req.scope() == ApprovalScope.CLIENT) {
            String msg = "Approval requested (" + req.targetType() + ")";
            notificationService.notifyUser(project.getClient().getUser(), "APPROVAL_REQUESTED", msg, project);
        } else if (req.scope() == ApprovalScope.AUTHORITY) {
            String msg = "Authority review requested (" + req.targetType() + ")";
            for (UserEntity admin : userRepository.findByRole(UserRole.ADMIN)) {
                notificationService.notifyUser(admin, "AUTHORITY_REVIEW_REQUESTED", msg, project);
            }
        }

        return toDto(saved);
    }

    @Transactional
    public CollaborationDtos.ApprovalDto decide(
            UserEntity actor,
            UUID projectId,
            UUID approvalId,
            CollaborationDtos.DecideApprovalRequest req
    ) {
        projectAccessService.requireProjectRead(actor, projectId);

        ProjectApprovalEntity approval = projectApprovalRepository.findByIdAndProjectId(approvalId, projectId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Approval not found"));

        if (approval.getStatus() != ApprovalStatus.PENDING) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "ALREADY_DECIDED", "This approval already has a decision");
        }
        if (req.status() == ApprovalStatus.PENDING) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_STATUS", "Decision must be APPROVED or REJECTED");
        }

        if (approval.getScope() == ApprovalScope.CLIENT) {
            if (actor.getRole() != UserRole.CLIENT) {
                throw new ApiException(HttpStatus.FORBIDDEN, "FORBIDDEN", "Only the client can decide this approval");
            }
        } else if (approval.getScope() == ApprovalScope.AUTHORITY) {
            if (actor.getRole() != UserRole.ADMIN) {
                throw new ApiException(HttpStatus.FORBIDDEN, "FORBIDDEN", "Only admins can decide authority reviews");
            }
        }

        approval.setStatus(req.status());
        approval.setDecisionComment(req.decisionComment());
        approval.setDecidedBy(actor);
        approval.setDecidedAt(Instant.now());
        ProjectApprovalEntity saved = projectApprovalRepository.save(approval);

        auditService.log(actor, "PROJECT_APPROVAL_DECIDED", "ProjectApproval", saved.getId());

        if (saved.getRequestedBy() != null) {
            String msg = "Approval " + saved.getStatus() + " (" + saved.getTargetType() + ")";
            notificationService.notifyUser(saved.getRequestedBy(), "APPROVAL_DECISION", msg, saved.getProject());
        }

        return toDto(saved);
    }

    private void requireValidTarget(UUID projectId, ApprovalTargetType type, UUID targetId) {
        if (type == ApprovalTargetType.DOCUMENT) {
            projectDocumentRepository.findByIdAndProjectId(targetId, projectId)
                    .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "INVALID_TARGET", "Document not found for this project"));
            return;
        }
        if (type == ApprovalTargetType.SUBDIVISION_RUN) {
            SubdivisionRunEntity run = subdivisionRunRepository.findById(targetId)
                    .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "INVALID_TARGET", "Subdivision run not found"));
            if (!run.getProject().getId().equals(projectId)) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_TARGET", "Subdivision run does not belong to this project");
            }
            return;
        }
        throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_TARGET", "Unsupported target type");
    }

    private CollaborationDtos.ApprovalDto toDto(ProjectApprovalEntity a) {
        return new CollaborationDtos.ApprovalDto(
                a.getId(),
                a.getProject().getId(),
                a.getScope(),
                a.getTargetType(),
                a.getTargetId(),
                a.getStatus(),
                a.getRequestNote(),
                a.getDecisionComment(),
                a.getRequestedBy() == null ? null : a.getRequestedBy().getUsername(),
                a.getDecidedBy() == null ? null : a.getDecidedBy().getUsername(),
                a.getCreatedAt(),
                a.getDecidedAt()
        );
    }
}

