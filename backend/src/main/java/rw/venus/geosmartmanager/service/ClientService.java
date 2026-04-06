package rw.venus.geosmartmanager.service;

import org.springframework.stereotype.Service;
import rw.venus.geosmartmanager.api.dto.ClientDtos;
import rw.venus.geosmartmanager.domain.KycStatus;
import rw.venus.geosmartmanager.entity.ClientEntity;
import rw.venus.geosmartmanager.repo.ClientRepository;

import java.time.Instant;
import java.util.List;

@Service
public class ClientService {
    private final ClientRepository clientRepository;
    private final AuditService auditService;
    private final CurrentUserService currentUserService;

    public ClientService(ClientRepository clientRepository, AuditService auditService, CurrentUserService currentUserService) {
        this.clientRepository = clientRepository;
        this.auditService = auditService;
        this.currentUserService = currentUserService;
    }

    public ClientEntity create(ClientDtos.ClientRequest request) {
        ClientEntity entity = ClientEntity.builder()
                .name(request.name())
                .contactEmail(normalizeOptional(request.contactEmail()))
                .phone(normalizeOptional(request.phone()))
                .address(normalizeOptional(request.address()))
                .idDocumentReference(normalizeOptional(request.idDocumentReference()))
                .landOwnershipReference(normalizeOptional(request.landOwnershipReference()))
                .kycStatus(request.kycStatus() != null ? request.kycStatus() : KycStatus.PENDING)
                .reviewerNotes(normalizeOptional(request.reviewerNotes()))
                .createdAt(Instant.now())
                .build();
        clientRepository.save(entity);
        auditService.log(currentUserService.getCurrentUserEmail(), "CREATE", "Client", entity.getId(), "Client created");
        return entity;
    }

    public List<ClientEntity> list() {
        return clientRepository.findAll();
    }

    public ClientEntity update(Long id, ClientDtos.ClientRequest request) {
        ClientEntity entity = clientRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Client not found"));
        entity.setName(request.name());
        entity.setContactEmail(normalizeOptional(request.contactEmail()));
        entity.setPhone(normalizeOptional(request.phone()));
        entity.setAddress(normalizeOptional(request.address()));
        entity.setIdDocumentReference(normalizeOptional(request.idDocumentReference()));
        entity.setLandOwnershipReference(normalizeOptional(request.landOwnershipReference()));
        entity.setKycStatus(request.kycStatus() != null ? request.kycStatus() : KycStatus.PENDING);
        entity.setReviewerNotes(normalizeOptional(request.reviewerNotes()));
        clientRepository.save(entity);
        auditService.log(currentUserService.getCurrentUserEmail(), "UPDATE", "Client", entity.getId(), "Client updated");
        return entity;
    }

    public void delete(Long id) {
        clientRepository.deleteById(id);
        auditService.log(currentUserService.getCurrentUserEmail(), "DELETE", "Client", id, "Client deleted");
    }

    private String normalizeOptional(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
