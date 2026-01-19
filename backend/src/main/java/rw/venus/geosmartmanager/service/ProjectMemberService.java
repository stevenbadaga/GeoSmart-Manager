package rw.venus.geosmartmanager.service;

import rw.venus.geosmartmanager.api.dto.ProjectMemberDtos;
import rw.venus.geosmartmanager.domain.ProjectMemberRole;
import rw.venus.geosmartmanager.entity.ProjectEntity;
import rw.venus.geosmartmanager.entity.ProjectMemberEntity;
import rw.venus.geosmartmanager.entity.UserEntity;
import rw.venus.geosmartmanager.exception.ApiException;
import rw.venus.geosmartmanager.repo.ProjectMemberRepository;
import rw.venus.geosmartmanager.repo.ProjectRepository;
import rw.venus.geosmartmanager.repo.UserRepository;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ProjectMemberService {
    private final ProjectRepository projectRepository;
    private final UserRepository userRepository;
    private final ProjectMemberRepository projectMemberRepository;
    private final ProjectAccessService projectAccessService;
    private final AuditService auditService;

    public ProjectMemberService(
            ProjectRepository projectRepository,
            UserRepository userRepository,
            ProjectMemberRepository projectMemberRepository,
            ProjectAccessService projectAccessService,
            AuditService auditService
    ) {
        this.projectRepository = projectRepository;
        this.userRepository = userRepository;
        this.projectMemberRepository = projectMemberRepository;
        this.projectAccessService = projectAccessService;
        this.auditService = auditService;
    }

    @Transactional(readOnly = true)
    public List<ProjectMemberDtos.MemberDto> listMembers(UserEntity actor, UUID projectId) {
        projectAccessService.requireProjectRead(actor, projectId);
        return projectMemberRepository.findByProjectIdOrderByAddedAtAsc(projectId).stream().map(this::toDto).toList();
    }

    @Transactional
    public ProjectMemberDtos.MemberDto addMember(UserEntity actor, UUID projectId, ProjectMemberDtos.AddMemberRequest req) {
        projectAccessService.requireProjectAdmin(actor, projectId);

        ProjectEntity project = projectRepository.findById(projectId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Project not found"));

        if (projectMemberRepository.existsByProjectIdAndUserId(projectId, req.userId())) {
            throw new ApiException(HttpStatus.CONFLICT, "ALREADY_MEMBER", "User is already a member of this project");
        }

        UserEntity user = userRepository.findById(req.userId())
                .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "INVALID_USER", "User not found"));
        if (!user.isEnabled()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "USER_DISABLED", "User is disabled");
        }

        ProjectMemberEntity member = new ProjectMemberEntity();
        member.setProject(project);
        member.setUser(user);
        member.setRole(req.projectRole());
        ProjectMemberEntity saved = projectMemberRepository.save(member);

        auditService.log(actor, "PROJECT_MEMBER_ADDED", "ProjectMember", saved.getId(), Map.of(
                "projectId", projectId,
                "userId", user.getId(),
                "role", saved.getRole().name()
        ));

        return toDto(saved);
    }

    @Transactional
    public ProjectMemberDtos.MemberDto updateRole(UserEntity actor, UUID projectId, UUID memberId, ProjectMemberDtos.UpdateMemberRoleRequest req) {
        projectAccessService.requireProjectAdmin(actor, projectId);

        ProjectMemberEntity member = projectMemberRepository.findById(memberId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Project member not found"));
        if (!member.getProject().getId().equals(projectId)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_MEMBER", "Member does not belong to project");
        }

        ProjectMemberRole newRole = req.projectRole();
        if (member.getRole() == ProjectMemberRole.PROJECT_ADMIN && newRole != ProjectMemberRole.PROJECT_ADMIN) {
            long admins = projectMemberRepository.countByProjectIdAndRole(projectId, ProjectMemberRole.PROJECT_ADMIN);
            if (admins <= 1) {
                throw new ApiException(HttpStatus.CONFLICT, "LAST_PROJECT_ADMIN", "At least one project admin is required");
            }
        }

        member.setRole(newRole);
        ProjectMemberEntity saved = projectMemberRepository.save(member);

        auditService.log(actor, "PROJECT_MEMBER_ROLE_UPDATED", "ProjectMember", saved.getId(), Map.of(
                "projectId", projectId,
                "userId", saved.getUser().getId(),
                "role", saved.getRole().name()
        ));

        return toDto(saved);
    }

    @Transactional
    public void removeMember(UserEntity actor, UUID projectId, UUID memberId) {
        projectAccessService.requireProjectAdmin(actor, projectId);

        ProjectMemberEntity member = projectMemberRepository.findById(memberId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Project member not found"));
        if (!member.getProject().getId().equals(projectId)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_MEMBER", "Member does not belong to project");
        }

        if (member.getRole() == ProjectMemberRole.PROJECT_ADMIN) {
            long admins = projectMemberRepository.countByProjectIdAndRole(projectId, ProjectMemberRole.PROJECT_ADMIN);
            if (admins <= 1) {
                throw new ApiException(HttpStatus.CONFLICT, "LAST_PROJECT_ADMIN", "At least one project admin is required");
            }
        }

        projectMemberRepository.delete(member);
        auditService.log(actor, "PROJECT_MEMBER_REMOVED", "ProjectMember", memberId, Map.of(
                "projectId", projectId,
                "userId", member.getUser().getId()
        ));
    }

    private ProjectMemberDtos.MemberDto toDto(ProjectMemberEntity m) {
        return new ProjectMemberDtos.MemberDto(
                m.getId(),
                m.getProject().getId(),
                m.getUser().getId(),
                m.getUser().getUsername(),
                m.getUser().getEmail(),
                m.getUser().getRole(),
                m.getRole(),
                m.getAddedAt()
        );
    }
}

