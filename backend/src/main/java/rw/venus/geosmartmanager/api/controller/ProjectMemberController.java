package rw.venus.geosmartmanager.api.controller;

import rw.venus.geosmartmanager.api.dto.ProjectMemberDtos;
import rw.venus.geosmartmanager.service.CurrentUserService;
import rw.venus.geosmartmanager.service.ProjectMemberService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/projects/{projectId}/members")
public class ProjectMemberController {
    private final ProjectMemberService projectMemberService;
    private final CurrentUserService currentUserService;

    public ProjectMemberController(ProjectMemberService projectMemberService, CurrentUserService currentUserService) {
        this.projectMemberService = projectMemberService;
        this.currentUserService = currentUserService;
    }

    @GetMapping
    public List<ProjectMemberDtos.MemberDto> list(@PathVariable UUID projectId) {
        return projectMemberService.listMembers(currentUserService.requireCurrentUser(), projectId);
    }

    @PostMapping
    public ProjectMemberDtos.MemberDto add(@PathVariable UUID projectId, @Valid @RequestBody ProjectMemberDtos.AddMemberRequest req) {
        return projectMemberService.addMember(currentUserService.requireCurrentUser(), projectId, req);
    }

    @PatchMapping("/{memberId}")
    public ProjectMemberDtos.MemberDto updateRole(
            @PathVariable UUID projectId,
            @PathVariable UUID memberId,
            @Valid @RequestBody ProjectMemberDtos.UpdateMemberRoleRequest req
    ) {
        return projectMemberService.updateRole(currentUserService.requireCurrentUser(), projectId, memberId, req);
    }

    @DeleteMapping("/{memberId}")
    public void remove(@PathVariable UUID projectId, @PathVariable UUID memberId) {
        projectMemberService.removeMember(currentUserService.requireCurrentUser(), projectId, memberId);
    }
}

