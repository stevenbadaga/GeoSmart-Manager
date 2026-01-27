package rw.venus.geosmartmanager.api.controller;

import rw.venus.geosmartmanager.api.dto.FieldDtos;
import rw.venus.geosmartmanager.entity.FieldObservationEntity;
import rw.venus.geosmartmanager.service.CurrentUserService;
import rw.venus.geosmartmanager.service.EquipmentLogService;
import rw.venus.geosmartmanager.service.FieldObservationService;
import jakarta.validation.Valid;
import java.nio.file.Path;
import java.util.List;
import java.util.UUID;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api")
public class FieldController {
    private final FieldObservationService fieldObservationService;
    private final EquipmentLogService equipmentLogService;
    private final CurrentUserService currentUserService;

    public FieldController(
            FieldObservationService fieldObservationService,
            EquipmentLogService equipmentLogService,
            CurrentUserService currentUserService
    ) {
        this.fieldObservationService = fieldObservationService;
        this.equipmentLogService = equipmentLogService;
        this.currentUserService = currentUserService;
    }

    @GetMapping("/projects/{projectId}/field/observations")
    public List<FieldDtos.ObservationDto> listObservations(@PathVariable UUID projectId) {
        return fieldObservationService.list(currentUserService.requireCurrentUser(), projectId);
    }

    @PostMapping("/projects/{projectId}/field/observations")
    public FieldDtos.ObservationDto createObservation(@PathVariable UUID projectId, @Valid @RequestBody FieldDtos.CreateObservationRequest req) {
        return fieldObservationService.create(currentUserService.requireCurrentUser(), projectId, req);
    }

    @PostMapping(value = "/projects/{projectId}/field/observations/{observationId}/photo", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public FieldDtos.ObservationDto uploadPhoto(
            @PathVariable UUID projectId,
            @PathVariable UUID observationId,
            @RequestPart("file") MultipartFile file
    ) {
        return fieldObservationService.uploadPhoto(currentUserService.requireCurrentUser(), projectId, observationId, file);
    }

    @GetMapping("/projects/{projectId}/field/observations/{observationId}/photo")
    public ResponseEntity<Resource> downloadPhoto(@PathVariable UUID projectId, @PathVariable UUID observationId) {
        FieldObservationEntity obs = fieldObservationService.requireAccessible(currentUserService.requireCurrentUser(), projectId, observationId);
        Path path = fieldObservationService.resolvePhotoPath(obs);
        Resource resource = new FileSystemResource(path);
        String filename = obs.getPhotoOriginalFilename() == null || obs.getPhotoOriginalFilename().isBlank()
                ? "photo-" + observationId
                : obs.getPhotoOriginalFilename();
        MediaType mediaType = obs.getPhotoContentType() == null || obs.getPhotoContentType().isBlank()
                ? MediaType.APPLICATION_OCTET_STREAM
                : MediaType.parseMediaType(obs.getPhotoContentType());
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(mediaType)
                .body(resource);
    }

    @GetMapping("/projects/{projectId}/field/equipment")
    public List<FieldDtos.EquipmentLogDto> listEquipment(@PathVariable UUID projectId) {
        return equipmentLogService.list(currentUserService.requireCurrentUser(), projectId);
    }

    @PostMapping("/projects/{projectId}/field/equipment")
    public FieldDtos.EquipmentLogDto createEquipment(@PathVariable UUID projectId, @Valid @RequestBody FieldDtos.CreateEquipmentLogRequest req) {
        return equipmentLogService.create(currentUserService.requireCurrentUser(), projectId, req);
    }
}

