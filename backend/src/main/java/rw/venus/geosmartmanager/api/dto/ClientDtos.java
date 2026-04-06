package rw.venus.geosmartmanager.api.dto;

import jakarta.validation.constraints.NotBlank;
import rw.venus.geosmartmanager.domain.KycStatus;

public class ClientDtos {
    public record ClientRequest(
            @NotBlank String name,
            String contactEmail,
            String phone,
            String address,
            String idDocumentReference,
            String landOwnershipReference,
            KycStatus kycStatus,
            String reviewerNotes
    ) {}

    public record ClientResponse(
            Long id,
            String name,
            String contactEmail,
            String phone,
            String address,
            String idDocumentReference,
            String landOwnershipReference,
            KycStatus kycStatus,
            String reviewerNotes
    ) {}
}
