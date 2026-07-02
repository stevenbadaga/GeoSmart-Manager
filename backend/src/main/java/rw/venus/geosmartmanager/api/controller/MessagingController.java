package rw.venus.geosmartmanager.api.controller;

import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import rw.venus.geosmartmanager.api.dto.MessagingDtos;
import rw.venus.geosmartmanager.service.MessagingService;

import java.util.List;

@RestController
@RequestMapping("/api/messages")
public class MessagingController {
    private final MessagingService messagingService;

    public MessagingController(MessagingService messagingService) {
        this.messagingService = messagingService;
    }

    @GetMapping("/contacts")
    public List<MessagingDtos.ContactResponse> contacts() {
        return messagingService.listContacts();
    }

    @GetMapping("/conversations")
    public List<MessagingDtos.ConversationResponse> conversations() {
        return messagingService.listConversations();
    }

    @PostMapping("/conversations")
    public MessagingDtos.ConversationResponse findOrCreate(@RequestBody MessagingDtos.ConversationRequest request) {
        return messagingService.findOrCreateConversation(request);
    }

    @GetMapping("/conversations/{conversationId}/messages")
    public List<MessagingDtos.MessageResponse> messages(@PathVariable Long conversationId) {
        return messagingService.listMessages(conversationId);
    }

    @PostMapping("/conversations/{conversationId}/messages")
    public MessagingDtos.MessageResponse send(@PathVariable Long conversationId,
                                              @RequestBody MessagingDtos.SendMessageRequest request) {
        return messagingService.sendMessage(conversationId, request);
    }

    @PatchMapping("/{messageId}")
    public MessagingDtos.MessageResponse update(@PathVariable Long messageId,
                                                @RequestBody MessagingDtos.SendMessageRequest request) {
        return messagingService.updateMessage(messageId, request);
    }

    @DeleteMapping("/{messageId}")
    public void delete(@PathVariable Long messageId) {
        messagingService.deleteMessage(messageId);
    }

    @PostMapping("/conversations/{conversationId}/read")
    public void markRead(@PathVariable Long conversationId) {
        messagingService.markRead(conversationId);
    }

    @GetMapping("/unread-count")
    public long unreadCount() {
        return messagingService.unreadCount();
    }
}
