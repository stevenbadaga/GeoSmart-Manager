package rw.venus.geosmartmanager.api.dto;

import rw.venus.geosmartmanager.domain.Role;

import java.time.Instant;
import java.util.List;

public class MessagingDtos {
    public record ContactResponse(
            Long id,
            String fullName,
            String email,
            Role role,
            String relationship
    ) {}

    public record ConversationRequest(Long recipientId) {}

    public record SendMessageRequest(String body) {}

    public record ParticipantResponse(
            Long userId,
            String fullName,
            String email,
            Role role
    ) {}

    public record ConversationResponse(
            Long id,
            String type,
            Long projectId,
            List<ParticipantResponse> participants,
            ParticipantResponse otherParticipant,
            MessageResponse lastMessage,
            long unreadCount,
            Instant updatedAt,
            Instant lastMessageAt
    ) {}

    public record MessageResponse(
            Long id,
            Long conversationId,
            Long senderId,
            String senderName,
            Role senderRole,
            String body,
            boolean mine,
            Instant createdAt
    ) {}
}
