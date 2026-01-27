package rw.venus.geosmartmanager.api.dto;

import java.time.Instant;
import java.util.UUID;

public final class NotificationDtos {
    private NotificationDtos() {}

    public record NotificationDto(
            UUID id,
            String type,
            String message,
            UUID projectId,
            Instant createdAt,
            Instant readAt
    ) {}
}

