package rw.venus.geosmartmanager.api.controller;

import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import rw.venus.geosmartmanager.api.dto.ClientDtos;
import rw.venus.geosmartmanager.entity.ClientEntity;
import rw.venus.geosmartmanager.service.ClientService;

import java.util.List;

@RestController
@RequestMapping("/api/clients")
public class ClientController {
    private final ClientService clientService;

    public ClientController(ClientService clientService) {
        this.clientService = clientService;
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','PROJECT_MANAGER')")
    public ClientDtos.ClientResponse create(@Valid @RequestBody ClientDtos.ClientRequest request) {
        ClientEntity entity = clientService.create(request);
        return toResponse(entity);
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','PROJECT_MANAGER','SURVEYOR','ENGINEER','CIVIL_ENGINEER','CLIENT')")
    public List<ClientDtos.ClientResponse> list() {
        return clientService.list().stream().map(this::toResponse).toList();
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','PROJECT_MANAGER')")
    public ClientDtos.ClientResponse update(@PathVariable Long id, @Valid @RequestBody ClientDtos.ClientRequest request) {
        return toResponse(clientService.update(id, request));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','PROJECT_MANAGER')")
    public void delete(@PathVariable Long id) {
        clientService.delete(id);
    }

    private ClientDtos.ClientResponse toResponse(ClientEntity entity) {
        return new ClientDtos.ClientResponse(
                entity.getId(),
                entity.getName(),
                entity.getContactEmail(),
                entity.getPhone(),
                entity.getAddress(),
                entity.getIdDocumentReference(),
                entity.getLandOwnershipReference(),
                entity.getKycStatus(),
                entity.getReviewerNotes()
        );
    }
}
