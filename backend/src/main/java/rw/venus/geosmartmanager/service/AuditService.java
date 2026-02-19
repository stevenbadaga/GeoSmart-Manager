package rw.venus.geosmartmanager.service;

import org.springframework.stereotype.Service;
import rw.venus.geosmartmanager.entity.AuditLogEntity;
import rw.venus.geosmartmanager.repo.AuditLogRepository;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Service
public class AuditService {
    private final AuditLogRepository auditLogRepository;

    public AuditService(AuditLogRepository auditLogRepository) {
        this.auditLogRepository = auditLogRepository;
    }

    public void log(String actorEmail, String action, String entityType, Long entityId, String details) {
        Optional<AuditLogEntity> lastLog = auditLogRepository.findTopByOrderByIdDesc();
        String prevHash = lastLog.map(AuditLogEntity::getHash).orElse("");
        AuditLogEntity log = AuditLogEntity.builder()
                .actorEmail(actorEmail)
                .action(action)
                .entityType(entityType)
                .entityId(entityId)
                .details(details)
                .prevHash(prevHash)
                .hash(sha256(prevHash + "|" + actorEmail + "|" + action + "|" + entityType + "|" + entityId + "|" + details))
                .createdAt(Instant.now())
                .build();
        auditLogRepository.save(log);
    }

    public List<AuditLogEntity> list() {
        return auditLogRepository.findAll();
    }

    public List<Long> verifyChain() {
        List<AuditLogEntity> logs = auditLogRepository.findAllByOrderByIdAsc();
        String prevHash = "";
        java.util.List<Long> broken = new java.util.ArrayList<>();
        for (AuditLogEntity log : logs) {
            String expected = sha256(prevHash + "|" + log.getActorEmail() + "|" + log.getAction() + "|" +
                    log.getEntityType() + "|" + log.getEntityId() + "|" + log.getDetails());
            if (!expected.equals(log.getHash()) || (log.getPrevHash() != null && !log.getPrevHash().equals(prevHash))) {
                broken.add(log.getId());
            }
            prevHash = log.getHash() == null ? "" : log.getHash();
        }
        return broken;
    }

    private String sha256(String input) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hashBytes = digest.digest(input.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder();
            for (byte b : hashBytes) {
                sb.append(String.format("%02x", b));
            }
            return sb.toString();
        } catch (Exception ex) {
            return "";
        }
    }
}
