package rw.venus.geosmartmanager.api.controller;

import rw.venus.geosmartmanager.api.dto.CollaborationDtos;
import rw.venus.geosmartmanager.service.CurrentUserService;
import rw.venus.geosmartmanager.service.ProjectApprovalService;
import rw.venus.geosmartmanager.service.ProjectMeetingService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class CollaborationController {
    private final ProjectApprovalService projectApprovalService;
    private final ProjectMeetingService projectMeetingService;
    private final CurrentUserService currentUserService;

    public CollaborationController(
            ProjectApprovalService projectApprovalService,
            ProjectMeetingService projectMeetingService,
            CurrentUserService currentUserService
    ) {
        this.projectApprovalService = projectApprovalService;
        this.projectMeetingService = projectMeetingService;
        this.currentUserService = currentUserService;
    }

    @GetMapping("/projects/{projectId}/approvals")
    public List<CollaborationDtos.ApprovalDto> listApprovals(@PathVariable UUID projectId) {
        return projectApprovalService.list(currentUserService.requireCurrentUser(), projectId);
    }

    @PostMapping("/projects/{projectId}/approvals")
    public CollaborationDtos.ApprovalDto requestApproval(
            @PathVariable UUID projectId,
            @Valid @RequestBody CollaborationDtos.RequestApprovalRequest req
    ) {
        return projectApprovalService.request(currentUserService.requireCurrentUser(), projectId, req);
    }

    @PostMapping("/projects/{projectId}/approvals/{approvalId}/decide")
    public CollaborationDtos.ApprovalDto decideApproval(
            @PathVariable UUID projectId,
            @PathVariable UUID approvalId,
            @Valid @RequestBody CollaborationDtos.DecideApprovalRequest req
    ) {
        return projectApprovalService.decide(currentUserService.requireCurrentUser(), projectId, approvalId, req);
    }

    @GetMapping("/projects/{projectId}/meetings")
    public List<CollaborationDtos.MeetingDto> listMeetings(@PathVariable UUID projectId) {
        return projectMeetingService.list(currentUserService.requireCurrentUser(), projectId);
    }

    @PostMapping("/projects/{projectId}/meetings")
    public CollaborationDtos.MeetingDto createMeeting(
            @PathVariable UUID projectId,
            @Valid @RequestBody CollaborationDtos.CreateMeetingRequest req
    ) {
        return projectMeetingService.create(currentUserService.requireCurrentUser(), projectId, req);
    }

    @PutMapping("/projects/{projectId}/meetings/{meetingId}")
    public CollaborationDtos.MeetingDto updateMeeting(
            @PathVariable UUID projectId,
            @PathVariable UUID meetingId,
            @Valid @RequestBody CollaborationDtos.UpdateMeetingRequest req
    ) {
        return projectMeetingService.update(currentUserService.requireCurrentUser(), projectId, meetingId, req);
    }
}

