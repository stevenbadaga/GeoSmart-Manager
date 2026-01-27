package rw.venus.geosmartmanager.service;

import rw.venus.geosmartmanager.api.dto.ClientDtos;
import rw.venus.geosmartmanager.domain.UserRole;
import rw.venus.geosmartmanager.entity.ClientEntity;
import rw.venus.geosmartmanager.entity.UserEntity;
import rw.venus.geosmartmanager.exception.ApiException;
import rw.venus.geosmartmanager.repo.ClientRepository;
import rw.venus.geosmartmanager.repo.ProjectRepository;
import rw.venus.geosmartmanager.repo.UserRepository;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

@Service
public class ClientService {
    private final ClientRepository clientRepository;
    private final ProjectRepository projectRepository;
    private final UserRepository userRepository;
    private final AuditService auditService;

    public ClientService(
            ClientRepository clientRepository,
            ProjectRepository projectRepository,
            UserRepository userRepository,
            AuditService auditService
    ) {
        this.clientRepository = clientRepository;
        this.projectRepository = projectRepository;
        this.userRepository = userRepository;
        this.auditService = auditService;
    }

    public List<ClientDtos.ClientDto> list(UserEntity actor) {
        if (actor.getRole() == UserRole.CLIENT) {
            return clientRepository.findByUserId(actor.getId()).map(this::toDto).stream().toList();
        }
        return clientRepository.findAllByOrderByCreatedAtDesc().stream().map(this::toDto).toList();
    }

    public ClientDtos.ClientDto get(UserEntity actor, UUID id) {
        ClientEntity client = clientRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Client not found"));

        if (actor.getRole() == UserRole.CLIENT) {
            if (client.getUser() == null || !client.getUser().getId().equals(actor.getId())) {
                throw new ApiException(HttpStatus.FORBIDDEN, "FORBIDDEN", "You do not have access to this client");
            }
        }
        return toDto(client);
    }

    public ClientDtos.ClientDto create(UserEntity actor, ClientDtos.CreateClientRequest req) {
        requireClientManagement(actor);

        ClientEntity client = new ClientEntity();
        client.setName(req.name());
        client.setEmail(req.email());
        client.setPhone(req.phone());
        client.setAddress(req.address());
        client.setKycIdType(req.kycIdType());
        client.setKycIdNumber(req.kycIdNumber());
        client.setKycNotes(req.kycNotes());
        client.setLandOwnershipDetails(req.landOwnershipDetails());

        if (req.userId() != null) {
            UserEntity u = userRepository.findById(req.userId())
                    .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "INVALID_USER", "User not found"));
            if (u.getRole() != UserRole.CLIENT) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_ROLE", "Only CLIENT users can be linked to clients");
            }
            if (!u.isEnabled()) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "USER_DISABLED", "User is disabled");
            }
            client.setUser(u);
        }

        ClientEntity saved = clientRepository.save(client);
        auditService.log(actor, "CLIENT_CREATED", "Client", saved.getId());
        return toDto(saved);
    }

    public ClientDtos.ClientDto update(UserEntity actor, UUID id, ClientDtos.UpdateClientRequest req) {
        requireClientManagement(actor);

        ClientEntity client = clientRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Client not found"));
        client.setName(req.name());
        client.setEmail(req.email());
        client.setPhone(req.phone());
        client.setAddress(req.address());
        client.setKycIdType(req.kycIdType());
        client.setKycIdNumber(req.kycIdNumber());
        client.setKycNotes(req.kycNotes());
        client.setLandOwnershipDetails(req.landOwnershipDetails());

        if (req.userId() == null) {
            client.setUser(null);
        } else {
            UserEntity u = userRepository.findById(req.userId())
                    .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "INVALID_USER", "User not found"));
            if (u.getRole() != UserRole.CLIENT) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_ROLE", "Only CLIENT users can be linked to clients");
            }
            if (!u.isEnabled()) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "USER_DISABLED", "User is disabled");
            }
            client.setUser(u);
        }

        ClientEntity saved = clientRepository.save(client);
        auditService.log(actor, "CLIENT_UPDATED", "Client", saved.getId());
        return toDto(saved);
    }

    public void delete(UserEntity actor, UUID id) {
        requireClientManagement(actor);

        if (!clientRepository.existsById(id)) {
            throw new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Client not found");
        }
        if (projectRepository.existsByClientId(id)) {
            throw new ApiException(HttpStatus.CONFLICT, "CLIENT_HAS_PROJECTS", "Cannot delete a client that has projects");
        }
        clientRepository.deleteById(id);
        auditService.log(actor, "CLIENT_DELETED", "Client", id);
    }

    private void requireClientManagement(UserEntity actor) {
        if (actor.getRole() == UserRole.ADMIN || actor.getRole() == UserRole.PROJECT_MANAGER) {
            return;
        }
        throw new ApiException(HttpStatus.FORBIDDEN, "FORBIDDEN", "You do not have permission to manage clients");
    }

    private ClientDtos.ClientDto toDto(ClientEntity c) {
        return new ClientDtos.ClientDto(
                c.getId(),
                c.getUser() == null ? null : c.getUser().getId(),
                c.getName(),
                c.getEmail(),
                c.getPhone(),
                c.getAddress(),
                c.getKycIdType(),
                c.getKycIdNumber(),
                c.getKycNotes(),
                c.getLandOwnershipDetails(),
                c.getCreatedAt()
        );
    }
}
