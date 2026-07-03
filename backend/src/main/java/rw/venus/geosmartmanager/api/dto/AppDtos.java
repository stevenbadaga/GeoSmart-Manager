package rw.venus.geosmartmanager.api.dto;

import java.time.Instant;

public class AppDtos {
    public record NotificationResponse(
            Long id,
            String title,
            String message,
            String type,
            Long relatedProjectId,
            Long relatedConversationId,
            boolean isRead,
            Instant createdAt
    ) {}

    public record ContactMessageRequest(
            String fullName,
            String email,
            String subject,
            String message
    ) {}

    public record ContactMessageResponse(
            Long id,
            String fullName,
            String email,
            String subject,
            String message,
            String status,
            Instant createdAt
    ) {}
}
