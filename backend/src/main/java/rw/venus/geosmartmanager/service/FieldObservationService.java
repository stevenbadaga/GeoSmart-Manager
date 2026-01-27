package rw.venus.geosmartmanager.service;

import rw.venus.geosmartmanager.api.dto.FieldDtos;
import rw.venus.geosmartmanager.entity.FieldObservationEntity;
import rw.venus.geosmartmanager.entity.ProjectEntity;
import rw.venus.geosmartmanager.entity.UserEntity;
import rw.venus.geosmartmanager.exception.ApiException;
import rw.venus.geosmartmanager.repo.FieldObservationRepository;
import rw.venus.geosmartmanager.repo.ProjectRepository;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.util.HexFormat;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
public class FieldObservationService {
    private final ProjectRepository projectRepository;
    private final FieldObservationRepository fieldObservationRepository;
    private final StorageService storageService;
    private final ProjectAccessService projectAccessService;
    private final AuditService auditService;

    public FieldObservationService(
            ProjectRepository projectRepository,
            FieldObservationRepository fieldObservationRepository,
            StorageService storageService,
            ProjectAccessService projectAccessService,
            AuditService auditService
    ) {
        this.projectRepository = projectRepository;
        this.fieldObservationRepository = fieldObservationRepository;
        this.storageService = storageService;
        this.projectAccessService = projectAccessService;
        this.auditService = auditService;
    }

    @Transactional(readOnly = true)
    public List<FieldDtos.ObservationDto> list(UserEntity actor, UUID projectId) {
        projectAccessService.requireProjectRead(actor, projectId);
        return fieldObservationRepository.findByProjectIdOrderByCreatedAtDesc(projectId)
                .stream()
                .map(this::toDto)
                .toList();
    }

    @Transactional
    public FieldDtos.ObservationDto create(UserEntity actor, UUID projectId, FieldDtos.CreateObservationRequest req) {
        projectAccessService.requireProjectWrite(actor, projectId);

        ProjectEntity project = projectRepository.findById(projectId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Project not found"));

        FieldObservationEntity obs = new FieldObservationEntity();
        obs.setProject(project);
        obs.setCreatedBy(actor);
        obs.setTitle(req.title());
        obs.setLatitude(req.latitude());
        obs.setLongitude(req.longitude());
        obs.setAltitudeM(req.altitudeM());
        obs.setAccuracyM(req.accuracyM());
        obs.setObservedAt(req.observedAt());
        obs.setNotes(req.notes());

        FieldObservationEntity saved = fieldObservationRepository.save(obs);
        auditService.log(actor, "FIELD_OBSERVATION_CREATED", "FieldObservation", saved.getId());
        return toDto(saved);
    }

    @Transactional(readOnly = true)
    public FieldObservationEntity requireAccessible(UserEntity actor, UUID projectId, UUID observationId) {
        projectAccessService.requireProjectRead(actor, projectId);
        return fieldObservationRepository.findByIdAndProjectId(observationId, projectId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Field observation not found"));
    }

    @Transactional
    public FieldDtos.ObservationDto uploadPhoto(UserEntity actor, UUID projectId, UUID observationId, MultipartFile file) {
        projectAccessService.requireProjectWrite(actor, projectId);

        FieldObservationEntity obs = fieldObservationRepository.findByIdAndProjectId(observationId, projectId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Field observation not found"));

        if (file == null || file.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_FILE", "Photo file is required");
        }
        String ct = file.getContentType();
        if (ct != null && !ct.isBlank() && !ct.startsWith("image/")) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_FILE", "Only image uploads are supported");
        }

        String original = file.getOriginalFilename() == null ? "photo.bin" : file.getOriginalFilename();
        String safeName = sanitizeFilename(original);
        String ext = extensionOf(safeName);

        Path abs = storageService.resolve("projects", projectId.toString(), "field", "observations", obs.getId() + ext);
        storageService.ensureParentDir(abs);

        byte[] bytes;
        try {
            bytes = file.getBytes();
            Files.write(abs, bytes);
        } catch (IOException ex) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "STORAGE_ERROR", "Failed to store photo");
        }

        obs.setPhotoOriginalFilename(original);
        obs.setPhotoContentType(ct);
        obs.setPhotoSizeBytes(file.getSize());
        obs.setPhotoStoredPath(storageService.getRoot().relativize(abs).toString());
        obs.setPhotoChecksumSha256(sha256Hex(bytes));
        FieldObservationEntity saved = fieldObservationRepository.save(obs);

        auditService.log(actor, "FIELD_OBSERVATION_PHOTO_UPLOADED", "FieldObservation", saved.getId());
        return toDto(saved);
    }

    public Path resolvePhotoPath(FieldObservationEntity obs) {
        if (obs.getPhotoStoredPath() == null || obs.getPhotoStoredPath().isBlank()) {
            throw new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Observation has no photo");
        }
        Path p = storageService.getRoot().resolve(obs.getPhotoStoredPath()).normalize();
        if (!Files.exists(p)) {
            throw new ApiException(HttpStatus.NOT_FOUND, "FILE_NOT_FOUND", "Photo file not found");
        }
        return p;
    }

    private FieldDtos.ObservationDto toDto(FieldObservationEntity o) {
        return new FieldDtos.ObservationDto(
                o.getId(),
                o.getProject().getId(),
                o.getTitle(),
                o.getLatitude(),
                o.getLongitude(),
                o.getAltitudeM(),
                o.getAccuracyM(),
                o.getObservedAt(),
                o.getNotes(),
                o.getPhotoStoredPath() != null && !o.getPhotoStoredPath().isBlank(),
                o.getCreatedBy() == null ? null : o.getCreatedBy().getUsername(),
                o.getCreatedAt()
        );
    }

    private String sha256Hex(byte[] bytes) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(md.digest(bytes));
        } catch (Exception ex) {
            return null;
        }
    }

    private String sanitizeFilename(String filename) {
        if (filename == null || filename.isBlank()) {
            return "upload.bin";
        }
        String s = filename.replace("\\", "/");
        int idx = s.lastIndexOf('/');
        if (idx >= 0) {
            s = s.substring(idx + 1);
        }
        s = s.replaceAll("[^A-Za-z0-9._-]", "_");
        if (s.length() > 120) {
            s = s.substring(s.length() - 120);
        }
        if (s.isBlank()) {
            return "upload.bin";
        }
        return s;
    }

    private String extensionOf(String filename) {
        if (filename == null) {
            return "";
        }
        int dot = filename.lastIndexOf('.');
        if (dot < 0 || dot == filename.length() - 1) {
            return "";
        }
        String ext = filename.substring(dot);
        return ext.length() > 16 ? "" : ext;
    }
}

