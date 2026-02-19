package rw.venus.geosmartmanager.api.dto;

import jakarta.validation.constraints.NotBlank;

public class ClientDtos {
    public record ClientRequest(
            @NotBlank String name,
            String contactEmail,
            String phone,
            String address
    ) {}

    public record ClientResponse(
            Long id,
            String name,
            String contactEmail,
            String phone,
            String address
    ) {}
}
