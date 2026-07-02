package rw.venus.geosmartmanager.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import rw.venus.geosmartmanager.api.dto.MessagingDtos;
import rw.venus.geosmartmanager.domain.ConversationType;
import rw.venus.geosmartmanager.domain.Role;
import rw.venus.geosmartmanager.entity.ClientEntity;
import rw.venus.geosmartmanager.entity.ConversationEntity;
import rw.venus.geosmartmanager.entity.ConversationParticipantEntity;
import rw.venus.geosmartmanager.entity.MessageEntity;
import rw.venus.geosmartmanager.entity.UserEntity;
import rw.venus.geosmartmanager.repo.ClientRepository;
import rw.venus.geosmartmanager.repo.ConversationParticipantRepository;
import rw.venus.geosmartmanager.repo.ConversationRepository;
import rw.venus.geosmartmanager.repo.MessageRepository;
import rw.venus.geosmartmanager.repo.ProjectRepository;
import rw.venus.geosmartmanager.repo.UserRepository;

import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class MessagingService {
    private final ConversationRepository conversationRepository;
    private final ConversationParticipantRepository participantRepository;
    private final MessageRepository messageRepository;
    private final UserRepository userRepository;
    private final ClientRepository clientRepository;
    private final ProjectRepository projectRepository;
    private final NotificationService notificationService;
    private final CurrentUserService currentUserService;
    private final AuditService auditService;

    public MessagingService(ConversationRepository conversationRepository,
                            ConversationParticipantRepository participantRepository,
                            MessageRepository messageRepository,
                            UserRepository userRepository,
                            ClientRepository clientRepository,
                            ProjectRepository projectRepository,
                            NotificationService notificationService,
                            CurrentUserService currentUserService,
                            AuditService auditService) {
        this.conversationRepository = conversationRepository;
        this.participantRepository = participantRepository;
        this.messageRepository = messageRepository;
        this.userRepository = userRepository;
        this.clientRepository = clientRepository;
        this.projectRepository = projectRepository;
        this.notificationService = notificationService;
        this.currentUserService = currentUserService;
        this.auditService = auditService;
    }

    public List<MessagingDtos.ContactResponse> listContacts() {
        UserEntity current = requireCurrentUser();
        return userRepository.findAll().stream()
                .filter(user -> !Objects.equals(user.getId(), current.getId()))
                .filter(user -> canMessage(current, user))
                .sorted(Comparator.comparing(UserEntity::getFullName, String.CASE_INSENSITIVE_ORDER))
                .map(user -> new MessagingDtos.ContactResponse(
                        user.getId(),
                        user.getFullName(),
                        user.getEmail(),
                        user.getRole(),
                        relationshipLabel(current, user)
                ))
                .toList();
    }

    public List<MessagingDtos.ConversationResponse> listConversations() {
        UserEntity current = requireCurrentUser();
        return conversationRepository.findVisibleForUser(current.getId()).stream()
                .map(conversation -> toConversationResponse(conversation, current))
                .toList();
    }

    @Transactional
    public MessagingDtos.ConversationResponse findOrCreateConversation(MessagingDtos.ConversationRequest request) {
        if (request == null || request.recipientId() == null) {
            throw new IllegalArgumentException("Recipient is required");
        }
        UserEntity current = requireCurrentUser();
        UserEntity recipient = userRepository.findById(request.recipientId())
                .orElseThrow(() -> new IllegalArgumentException("Recipient not found"));
        validateCanMessage(current, recipient);

        ConversationEntity conversation = conversationRepository
                .findDirectBetweenUsers(ConversationType.DIRECT, current.getId(), recipient.getId())
                .orElseGet(() -> createDirectConversation(current, recipient));

        markRead(conversation.getId());
        return toConversationResponse(conversation, current);
    }

    public List<MessagingDtos.MessageResponse> listMessages(Long conversationId) {
        UserEntity current = requireCurrentUser();
        ensureParticipant(conversationId, current.getId());
        return messageRepository.findByConversationIdAndDeletedAtIsNullOrderByCreatedAtAsc(conversationId).stream()
                .map(message -> toMessageResponse(message, current.getId()))
                .toList();
    }

    @Transactional
    public MessagingDtos.MessageResponse sendMessage(Long conversationId, MessagingDtos.SendMessageRequest request) {
        UserEntity current = requireCurrentUser();
        ConversationEntity conversation = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new IllegalArgumentException("Conversation not found"));
        ensureParticipant(conversationId, current.getId());
        String body = request == null ? null : normalizeBody(request.body());
        if (body == null) {
            throw new IllegalArgumentException("Message body is required");
        }

        Instant now = Instant.now();
        MessageEntity message = messageRepository.save(MessageEntity.builder()
                .conversation(conversation)
                .sender(current)
                .body(body)
                .createdAt(now)
                .build());
        conversation.setLastMessageAt(now);
        conversation.setUpdatedAt(now);
        conversationRepository.save(conversation);

        participantRepository.findByConversationIdAndUserId(conversationId, current.getId()).ifPresent(participant -> {
            participant.setLastReadAt(now);
            participantRepository.save(participant);
        });

        participantRepository.findByConversationIdAndUserIdNot(conversationId, current.getId()).forEach(participant -> {
            notificationService.create(
                    participant.getUserId(),
                    "New message from " + current.getFullName(),
                    preview(body),
                    "INFO",
                    conversation.getProjectId(),
                    conversation.getId()
            );
        });

        auditService.log(current.getEmail(), "SEND_MESSAGE", "Message", message.getId(), "Message sent");
        return toMessageResponse(message, current.getId());
    }

    @Transactional
    public MessagingDtos.MessageResponse updateMessage(Long messageId, MessagingDtos.SendMessageRequest request) {
        MessageEntity message = messageRepository.findById(messageId)
                .orElseThrow(() -> new IllegalArgumentException("Message not found"));
        UserEntity current = requireCurrentUser();
        if (!Objects.equals(message.getSender().getId(), current.getId()) && current.getRole() != Role.ADMIN) {
            throw new org.springframework.security.access.AccessDeniedException("You do not have permission to edit this message");
        }
        if (message.getDeletedAt() != null) {
            throw new IllegalArgumentException("Cannot edit a deleted message");
        }
        String body = request == null ? null : normalizeBody(request.body());
        if (body == null) {
            throw new IllegalArgumentException("Message body is required");
        }
        message.setBody(body);
        message.setUpdatedAt(Instant.now());
        messageRepository.save(message);

        auditService.log(current.getEmail(), "EDIT_MESSAGE", "Message", message.getId(), "Message edited");
        return toMessageResponse(message, current.getId());
    }

    @Transactional
    public void deleteMessage(Long messageId) {
        MessageEntity message = messageRepository.findById(messageId)
                .orElseThrow(() -> new IllegalArgumentException("Message not found"));
        UserEntity current = requireCurrentUser();
        if (!Objects.equals(message.getSender().getId(), current.getId()) && current.getRole() != Role.ADMIN) {
            throw new org.springframework.security.access.AccessDeniedException("You do not have permission to delete this message");
        }
        message.setDeletedAt(Instant.now());
        messageRepository.save(message);

        // Update conversation last message timestamp if necessary
        ConversationEntity conversation = message.getConversation();
        java.util.Optional<MessageEntity> newLastMessage = messageRepository
                .findTopByConversationIdAndDeletedAtIsNullOrderByCreatedAtDesc(conversation.getId());
        Instant lastMessageAt = newLastMessage.map(MessageEntity::getCreatedAt).orElse(conversation.getCreatedAt());
        conversation.setLastMessageAt(lastMessageAt);
        conversationRepository.save(conversation);

        auditService.log(current.getEmail(), "DELETE_MESSAGE", "Message", message.getId(), "Message deleted");
    }


    @Transactional
    public void markRead(Long conversationId) {
        UserEntity current = requireCurrentUser();
        ConversationEntity conversation = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new IllegalArgumentException("Conversation not found"));
        ConversationParticipantEntity participant = participantRepository
                .findByConversationIdAndUserId(conversation.getId(), current.getId())
                .orElseThrow(() -> new IllegalArgumentException("Conversation not found"));
        participant.setLastReadAt(Instant.now());
        participantRepository.save(participant);
        notificationService.markConversationNotificationsAsRead(current.getId(), conversation.getId());
    }

    public long unreadCount() {
        return messageRepository.countUnreadForUser(requireCurrentUser().getId());
    }

    private ConversationEntity createDirectConversation(UserEntity current, UserEntity recipient) {
        Instant now = Instant.now();
        ConversationEntity conversation = conversationRepository.save(ConversationEntity.builder()
                .type(ConversationType.DIRECT)
                .createdBy(current.getId())
                .createdAt(now)
                .updatedAt(now)
                .build());
        participantRepository.save(ConversationParticipantEntity.builder()
                .conversation(conversation)
                .userId(current.getId())
                .roleAtJoin(current.getRole().name())
                .joinedAt(now)
                .lastReadAt(now)
                .build());
        participantRepository.save(ConversationParticipantEntity.builder()
                .conversation(conversation)
                .userId(recipient.getId())
                .roleAtJoin(recipient.getRole().name())
                .joinedAt(now)
                .build());
        auditService.log(current.getEmail(), "CREATE_CONVERSATION", "Conversation", conversation.getId(), "Messaging conversation created");
        return conversation;
    }

    private MessagingDtos.ConversationResponse toConversationResponse(ConversationEntity conversation, UserEntity current) {
        List<ConversationParticipantEntity> participants = participantRepository.findByConversationId(conversation.getId());
        Map<Long, UserEntity> usersById = userRepository.findAllById(
                participants.stream().map(ConversationParticipantEntity::getUserId).toList()
        ).stream().collect(Collectors.toMap(UserEntity::getId, Function.identity()));
        List<MessagingDtos.ParticipantResponse> participantResponses = participants.stream()
                .map(participant -> toParticipantResponse(usersById.get(participant.getUserId())))
                .filter(Objects::nonNull)
                .toList();
        MessagingDtos.ParticipantResponse otherParticipant = participants.stream()
                .filter(participant -> !Objects.equals(participant.getUserId(), current.getId()))
                .map(participant -> toParticipantResponse(usersById.get(participant.getUserId())))
                .filter(Objects::nonNull)
                .findFirst()
                .orElse(null);
        MessagingDtos.MessageResponse lastMessage = messageRepository
                .findTopByConversationIdAndDeletedAtIsNullOrderByCreatedAtDesc(conversation.getId())
                .map(message -> toMessageResponse(message, current.getId()))
                .orElse(null);
        return new MessagingDtos.ConversationResponse(
                conversation.getId(),
                conversation.getType().name(),
                conversation.getProjectId(),
                participantResponses,
                otherParticipant,
                lastMessage,
                messageRepository.countUnreadForConversation(current.getId(), conversation.getId()),
                conversation.getUpdatedAt(),
                conversation.getLastMessageAt()
        );
    }

    private MessagingDtos.ParticipantResponse toParticipantResponse(UserEntity user) {
        if (user == null) {
            return null;
        }
        return new MessagingDtos.ParticipantResponse(user.getId(), user.getFullName(), user.getEmail(), user.getRole());
    }

    private MessagingDtos.MessageResponse toMessageResponse(MessageEntity message, Long currentUserId) {
        UserEntity sender = message.getSender();
        return new MessagingDtos.MessageResponse(
                message.getId(),
                message.getConversation().getId(),
                sender.getId(),
                sender.getFullName(),
                sender.getRole(),
                message.getBody(),
                Objects.equals(sender.getId(), currentUserId),
                message.getCreatedAt(),
                message.getUpdatedAt()
        );
    }

    private void ensureParticipant(Long conversationId, Long userId) {
        if (!participantRepository.existsByConversationIdAndUserId(conversationId, userId)) {
            throw new IllegalArgumentException("Conversation not found");
        }
    }

    private void validateCanMessage(UserEntity sender, UserEntity recipient) {
        if (!canMessage(sender, recipient)) {
            throw new IllegalArgumentException("You are not allowed to message this user");
        }
    }

    private boolean canMessage(UserEntity sender, UserEntity recipient) {
        if (sender == null || recipient == null || sender.getRole() == null || recipient.getRole() == null) {
            return false;
        }
        if (sender.getRole() == Role.ADMIN) {
            return recipient.getRole() == Role.SURVEYOR || recipient.getRole() == Role.CLIENT;
        }
        if (recipient.getRole() == Role.ADMIN) {
            return sender.getRole() == Role.SURVEYOR || sender.getRole() == Role.CLIENT;
        }
        if (sender.getRole() == Role.SURVEYOR && recipient.getRole() == Role.CLIENT) {
            return clientRepository.findByUserId(recipient.getId())
                    .map(client -> projectRepository.existsByClientIdAndAssignedSurveyorId(client.getId(), sender.getId()))
                    .orElse(false);
        }
        if (sender.getRole() == Role.CLIENT && recipient.getRole() == Role.SURVEYOR) {
            return clientRepository.findByUserId(sender.getId())
                    .map(client -> projectRepository.existsByClientIdAndAssignedSurveyorId(client.getId(), recipient.getId()))
                    .orElse(false);
        }
        return false;
    }

    private String relationshipLabel(UserEntity current, UserEntity target) {
        if (target.getRole() == Role.ADMIN) {
            return "Admin";
        }
        if (current.getRole() == Role.ADMIN) {
            return target.getRole() == Role.SURVEYOR ? "Land surveyor" : "Client";
        }
        if (target.getRole() == Role.SURVEYOR) {
            return "Assigned land surveyor";
        }
        return "Assigned client";
    }

    private UserEntity requireCurrentUser() {
        UserEntity current = currentUserService.getCurrentUser();
        if (current == null) {
            throw new IllegalArgumentException("No authenticated user");
        }
        return current;
    }

    private String normalizeBody(String body) {
        if (body == null) {
            return null;
        }
        String trimmed = body.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private String preview(String body) {
        String compact = body.replaceAll("\\s+", " ").trim();
        return compact.length() <= 140 ? compact : compact.substring(0, 137).trim() + "...";
    }
}
