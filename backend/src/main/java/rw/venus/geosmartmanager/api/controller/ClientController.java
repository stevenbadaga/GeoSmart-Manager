package rw.venus.geosmartmanager.api.controller;

import rw.venus.geosmartmanager.api.dto.ClientDtos;
import rw.venus.geosmartmanager.service.ClientService;
import rw.venus.geosmartmanager.service.CurrentUserService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/clients")
public class ClientController {
    private final ClientService clientService;
    private final CurrentUserService currentUserService;

    public ClientController(ClientService clientService, CurrentUserService currentUserService) {
        this.clientService = clientService;
        this.currentUserService = currentUserService;
    }

    @GetMapping
    public List<ClientDtos.ClientDto> list() {
        return clientService.list();
    }

    @GetMapping("/{id}")
    public ClientDtos.ClientDto get(@PathVariable UUID id) {
        return clientService.get(id);
    }

    @PostMapping
    public ClientDtos.ClientDto create(@Valid @RequestBody ClientDtos.CreateClientRequest req) {
        return clientService.create(currentUserService.requireCurrentUser(), req);
    }

    @PutMapping("/{id}")
    public ClientDtos.ClientDto update(@PathVariable UUID id, @Valid @RequestBody ClientDtos.UpdateClientRequest req) {
        return clientService.update(currentUserService.requireCurrentUser(), id, req);
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable UUID id) {
        clientService.delete(currentUserService.requireCurrentUser(), id);
    }
}

