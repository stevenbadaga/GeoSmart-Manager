package rw.venus.geosmartmanager.service;

import org.springframework.stereotype.Service;
import rw.venus.geosmartmanager.api.dto.ClientDtos;
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
                .contactEmail(request.contactEmail())
                .phone(request.phone())
                .address(request.address())
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
        entity.setContactEmail(request.contactEmail());
        entity.setPhone(request.phone());
        entity.setAddress(request.address());
        clientRepository.save(entity);
        auditService.log(currentUserService.getCurrentUserEmail(), "UPDATE", "Client", entity.getId(), "Client updated");
        return entity;
    }

    public void delete(Long id) {
        clientRepository.deleteById(id);
        auditService.log(currentUserService.getCurrentUserEmail(), "DELETE", "Client", id, "Client deleted");
    }
}
