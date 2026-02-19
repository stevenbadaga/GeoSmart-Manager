package rw.venus.geosmartmanager.api.dto;

public class AuditDtos {
    public record AuditLogResponse(
            Long id,
            String actorEmail,
            String action,
            String entityType,
            Long entityId,
            String details,
            String createdAt
    ) {}
}
