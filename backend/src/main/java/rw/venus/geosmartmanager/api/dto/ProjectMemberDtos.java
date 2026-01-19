package rw.venus.geosmartmanager.api.dto;

import rw.venus.geosmartmanager.domain.ProjectMemberRole;
import rw.venus.geosmartmanager.domain.UserRole;
import jakarta.validation.constraints.NotNull;
import java.time.Instant;
import java.util.UUID;

public final class ProjectMemberDtos {
    private ProjectMemberDtos() {}

    public record MemberDto(
            UUID id,
            UUID projectId,
            UUID userId,
            String username,
            String email,
            UserRole userRole,
            ProjectMemberRole projectRole,
            Instant addedAt
    ) {}

    public record AddMemberRequest(
            @NotNull UUID userId,
            @NotNull ProjectMemberRole projectRole
    ) {}

    public record UpdateMemberRoleRequest(
            @NotNull ProjectMemberRole projectRole
    ) {}
}

