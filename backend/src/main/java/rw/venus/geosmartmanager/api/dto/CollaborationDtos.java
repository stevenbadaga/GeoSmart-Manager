package rw.venus.geosmartmanager.api.dto;

import rw.venus.geosmartmanager.domain.ApprovalScope;
import rw.venus.geosmartmanager.domain.ApprovalStatus;
import rw.venus.geosmartmanager.domain.ApprovalTargetType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.UUID;

public final class CollaborationDtos {
    private CollaborationDtos() {}

    public record RequestApprovalRequest(
            @NotNull ApprovalScope scope,
            @NotNull ApprovalTargetType targetType,
            @NotNull UUID targetId,
            String requestNote
    ) {}

    public record DecideApprovalRequest(
            @NotNull ApprovalStatus status,
            String decisionComment
    ) {}

    public record ApprovalDto(
            UUID id,
            UUID projectId,
            ApprovalScope scope,
            ApprovalTargetType targetType,
            UUID targetId,
            ApprovalStatus status,
            String requestNote,
            String decisionComment,
            String requestedByUsername,
            String decidedByUsername,
            Instant createdAt,
            Instant decidedAt
    ) {}

    public record CreateMeetingRequest(
            @NotBlank @Size(max = 255) String title,
            @NotNull Instant scheduledAt,
            @Size(max = 255) String location,
            String agenda
    ) {}

    public record UpdateMeetingRequest(
            @NotNull Instant scheduledAt,
            @Size(max = 255) String location,
            String agenda,
            String minutes
    ) {}

    public record MeetingDto(
            UUID id,
            UUID projectId,
            String title,
            Instant scheduledAt,
            String location,
            String agenda,
            String minutes,
            String createdByUsername,
            Instant createdAt,
            Instant updatedAt
    ) {}
}

