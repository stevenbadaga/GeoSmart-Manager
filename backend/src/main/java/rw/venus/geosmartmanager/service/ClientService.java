package rw.venus.geosmartmanager.service;

import rw.venus.geosmartmanager.api.dto.ClientDtos;
import rw.venus.geosmartmanager.entity.ClientEntity;
import rw.venus.geosmartmanager.entity.UserEntity;
import rw.venus.geosmartmanager.exception.ApiException;
import rw.venus.geosmartmanager.repo.ClientRepository;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

@Service
public class ClientService {
    private final ClientRepository clientRepository;
    private final AuditService auditService;

    public ClientService(ClientRepository clientRepository, AuditService auditService) {
        this.clientRepository = clientRepository;
        this.auditService = auditService;
    }

    public List<ClientDtos.ClientDto> list() {
        return clientRepository.findAll().stream().map(this::toDto).toList();
    }

    public ClientDtos.ClientDto get(UUID id) {
        return toDto(clientRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Client not found")));
    }

    public ClientDtos.ClientDto create(UserEntity actor, ClientDtos.CreateClientRequest req) {
        ClientEntity client = new ClientEntity();
        client.setName(req.name());
        client.setEmail(req.email());
        client.setPhone(req.phone());
        client.setAddress(req.address());
        ClientEntity saved = clientRepository.save(client);
        auditService.log(actor, "CLIENT_CREATED", "Client", saved.getId());
        return toDto(saved);
    }

    public ClientDtos.ClientDto update(UserEntity actor, UUID id, ClientDtos.UpdateClientRequest req) {
        ClientEntity client = clientRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Client not found"));
        client.setName(req.name());
        client.setEmail(req.email());
        client.setPhone(req.phone());
        client.setAddress(req.address());
        ClientEntity saved = clientRepository.save(client);
        auditService.log(actor, "CLIENT_UPDATED", "Client", saved.getId());
        return toDto(saved);
    }

    public void delete(UserEntity actor, UUID id) {
        if (!clientRepository.existsById(id)) {
            throw new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Client not found");
        }
        clientRepository.deleteById(id);
        auditService.log(actor, "CLIENT_DELETED", "Client", id);
    }

    private ClientDtos.ClientDto toDto(ClientEntity c) {
        return new ClientDtos.ClientDto(c.getId(), c.getName(), c.getEmail(), c.getPhone(), c.getAddress(), c.getCreatedAt());
    }
}

