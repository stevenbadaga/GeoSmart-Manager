package rw.venus.geosmartmanager.api.dto;

import java.time.Instant;
import java.util.UUID;

public final class AuditDtos {
    private AuditDtos() {}

    public record AuditLogDto(
            UUID id,
            String actorUsername,
            String action,
            String entityType,
            String entityId,
            String detailsJson,
            Instant createdAt
    ) {}
}

