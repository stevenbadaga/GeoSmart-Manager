package rw.venus.geosmartmanager.service;

import rw.venus.geosmartmanager.api.dto.CollaborationDtos;
import rw.venus.geosmartmanager.entity.ProjectEntity;
import rw.venus.geosmartmanager.entity.ProjectMeetingEntity;
import rw.venus.geosmartmanager.entity.ProjectMemberEntity;
import rw.venus.geosmartmanager.entity.UserEntity;
import rw.venus.geosmartmanager.exception.ApiException;
import rw.venus.geosmartmanager.repo.ProjectMeetingRepository;
import rw.venus.geosmartmanager.repo.ProjectMemberRepository;
import rw.venus.geosmartmanager.repo.ProjectRepository;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ProjectMeetingService {
    private final ProjectRepository projectRepository;
    private final ProjectMeetingRepository projectMeetingRepository;
    private final ProjectMemberRepository projectMemberRepository;
    private final ProjectAccessService projectAccessService;
    private final NotificationService notificationService;
    private final AuditService auditService;

    public ProjectMeetingService(
            ProjectRepository projectRepository,
            ProjectMeetingRepository projectMeetingRepository,
            ProjectMemberRepository projectMemberRepository,
            ProjectAccessService projectAccessService,
            NotificationService notificationService,
            AuditService auditService
    ) {
        this.projectRepository = projectRepository;
        this.projectMeetingRepository = projectMeetingRepository;
        this.projectMemberRepository = projectMemberRepository;
        this.projectAccessService = projectAccessService;
        this.notificationService = notificationService;
        this.auditService = auditService;
    }

    @Transactional(readOnly = true)
    public List<CollaborationDtos.MeetingDto> list(UserEntity actor, UUID projectId) {
        projectAccessService.requireProjectRead(actor, projectId);
        return projectMeetingRepository.findByProjectIdOrderByScheduledAtDesc(projectId)
                .stream()
                .map(this::toDto)
                .toList();
    }

    @Transactional
    public CollaborationDtos.MeetingDto create(UserEntity actor, UUID projectId, CollaborationDtos.CreateMeetingRequest req) {
        projectAccessService.requireProjectWrite(actor, projectId);

        ProjectEntity project = projectRepository.findById(projectId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Project not found"));

        ProjectMeetingEntity meeting = new ProjectMeetingEntity();
        meeting.setProject(project);
        meeting.setCreatedBy(actor);
        meeting.setTitle(req.title());
        meeting.setScheduledAt(req.scheduledAt());
        meeting.setLocation(req.location());
        meeting.setAgenda(req.agenda());
        ProjectMeetingEntity saved = projectMeetingRepository.save(meeting);

        auditService.log(actor, "PROJECT_MEETING_CREATED", "ProjectMeeting", saved.getId());

        String msg = "Meeting scheduled: " + saved.getTitle();
        notificationService.notifyUser(project.getClient().getUser(), "MEETING_SCHEDULED", msg, project);
        for (ProjectMemberEntity member : projectMemberRepository.findByProjectIdOrderByAddedAtAsc(projectId)) {
            if (member.getUser() == null || member.getUser().getId().equals(actor.getId())) {
                continue;
            }
            notificationService.notifyUser(member.getUser(), "MEETING_SCHEDULED", msg, project);
        }

        return toDto(saved);
    }

    @Transactional
    public CollaborationDtos.MeetingDto update(UserEntity actor, UUID projectId, UUID meetingId, CollaborationDtos.UpdateMeetingRequest req) {
        projectAccessService.requireProjectWrite(actor, projectId);

        ProjectMeetingEntity meeting = projectMeetingRepository.findByIdAndProjectId(meetingId, projectId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Meeting not found"));

        meeting.setScheduledAt(req.scheduledAt());
        meeting.setLocation(req.location());
        meeting.setAgenda(req.agenda());
        meeting.setMinutes(req.minutes());
        ProjectMeetingEntity saved = projectMeetingRepository.save(meeting);

        auditService.log(actor, "PROJECT_MEETING_UPDATED", "ProjectMeeting", saved.getId());
        return toDto(saved);
    }

    private CollaborationDtos.MeetingDto toDto(ProjectMeetingEntity m) {
        return new CollaborationDtos.MeetingDto(
                m.getId(),
                m.getProject().getId(),
                m.getTitle(),
                m.getScheduledAt(),
                m.getLocation(),
                m.getAgenda(),
                m.getMinutes(),
                m.getCreatedBy() == null ? null : m.getCreatedBy().getUsername(),
                m.getCreatedAt(),
                m.getUpdatedAt()
        );
    }
}
