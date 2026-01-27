package rw.venus.geosmartmanager.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import rw.venus.geosmartmanager.api.dto.AuditDtos;
import rw.venus.geosmartmanager.entity.AuditLogEntity;
import rw.venus.geosmartmanager.entity.UserEntity;
import rw.venus.geosmartmanager.repo.AuditLogRepository;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuditService {
    private final AuditLogRepository auditLogRepository;
    private final ObjectMapper objectMapper;

    public AuditService(AuditLogRepository auditLogRepository, ObjectMapper objectMapper) {
        this.auditLogRepository = auditLogRepository;
        this.objectMapper = objectMapper;
    }

    public void log(UserEntity actor, String action, String entityType, Object entityId, Object details) {
        AuditLogEntity log = new AuditLogEntity();
        log.setActor(actor);
        log.setAction(action);
        log.setEntityType(entityType);
        log.setEntityId(entityId == null ? null : String.valueOf(entityId));
        log.setDetailsJson(serialize(details));
        auditLogRepository.save(log);
    }

    public void log(UserEntity actor, String action, String entityType, Object entityId) {
        log(actor, action, entityType, entityId, Map.of());
    }

    @Transactional(readOnly = true)
    public List<AuditDtos.AuditLogDto> list(int page, int size) {
        return auditLogRepository.findAllByOrderByCreatedAtDesc(PageRequest.of(page, size))
                .stream()
                .map(a -> new AuditDtos.AuditLogDto(
                        a.getId(),
                        a.getActor() == null ? null : a.getActor().getUsername(),
                        a.getAction(),
                        a.getEntityType(),
                        a.getEntityId(),
                        a.getDetailsJson(),
                        a.getCreatedAt()
                ))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<AuditDtos.AuditLogDto> listForActor(UUID actorId, int page, int size) {
        return auditLogRepository.findByActorIdOrderByCreatedAtDesc(actorId, PageRequest.of(page, size))
                .stream()
                .map(a -> new AuditDtos.AuditLogDto(
                        a.getId(),
                        a.getActor() == null ? null : a.getActor().getUsername(),
                        a.getAction(),
                        a.getEntityType(),
                        a.getEntityId(),
                        a.getDetailsJson(),
                        a.getCreatedAt()
                ))
                .toList();
    }

    private String serialize(Object details) {
        if (details == null) {
            return null;
        }
        try {
            return objectMapper.writeValueAsString(details);
        } catch (Exception ex) {
            return null;
        }
    }
}
