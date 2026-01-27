package rw.venus.geosmartmanager.service;

import rw.venus.geosmartmanager.api.dto.DatasetDtos;
import com.fasterxml.jackson.databind.ObjectMapper;
import rw.venus.geosmartmanager.entity.DatasetEntity;
import rw.venus.geosmartmanager.entity.ProjectEntity;
import rw.venus.geosmartmanager.entity.UserEntity;
import rw.venus.geosmartmanager.exception.ApiException;
import rw.venus.geosmartmanager.repo.DatasetRepository;
import rw.venus.geosmartmanager.repo.ProjectRepository;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.DigestInputStream;
import java.security.MessageDigest;
import java.util.HexFormat;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
public class DatasetService {
    private final DatasetRepository datasetRepository;
    private final ProjectRepository projectRepository;
    private final StorageService storageService;
    private final ProjectAccessService projectAccessService;
    private final AuditService auditService;
    private final ObjectMapper objectMapper;
    private final GeospatialImportService geospatialImportService;

    public DatasetService(
            DatasetRepository datasetRepository,
            ProjectRepository projectRepository,
            StorageService storageService,
            ProjectAccessService projectAccessService,
            AuditService auditService,
            ObjectMapper objectMapper,
            GeospatialImportService geospatialImportService
    ) {
        this.datasetRepository = datasetRepository;
        this.projectRepository = projectRepository;
        this.storageService = storageService;
        this.projectAccessService = projectAccessService;
        this.auditService = auditService;
        this.objectMapper = objectMapper;
        this.geospatialImportService = geospatialImportService;
    }

    public List<DatasetDtos.DatasetDto> listByProject(UserEntity actor, UUID projectId) {
        projectAccessService.requireProjectRead(actor, projectId);
        return datasetRepository.findByProjectIdOrderByUploadedAtDesc(projectId).stream().map(this::toDto).toList();
    }

    public DatasetDtos.DatasetDto upload(
            UserEntity actor,
            UUID projectId,
            DatasetDtos.CreateDatasetMetadata meta,
            MultipartFile file,
            MultipartFile previewGeojson
    ) {
        projectAccessService.requireProjectWrite(actor, projectId);

        ProjectEntity project = projectRepository.findById(projectId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Project not found"));

        if (file == null || file.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_FILE", "File is required");
        }

        DatasetEntity dataset = new DatasetEntity();
        dataset.setProject(project);
        dataset.setName(meta.name());
        dataset.setType(meta.type());
        dataset.setOriginalFilename(file.getOriginalFilename() == null ? "upload.geojson" : file.getOriginalFilename());
        dataset.setContentType(file.getContentType());
        dataset.setSizeBytes(file.getSize());
        dataset.setStoredPath("PENDING");
        dataset.setFormat(detectFormat(dataset.getOriginalFilename()));
        dataset.setVersion(nextVersion(projectId, dataset.getName(), dataset.getType()));
        DatasetEntity saved = datasetRepository.save(dataset);

        String ext = guessExtension(saved.getOriginalFilename());
        Path abs = storageService.resolve("projects", projectId.toString(), "datasets", saved.getId() + ext);
        storageService.ensureParentDir(abs);
        try (InputStream in = file.getInputStream()) {
            String checksum = writeWithSha256(in, abs);
            saved.setChecksumSha256(checksum);
        } catch (IOException ex) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "STORAGE_ERROR", "Failed to store file");
        }

        saved.setStoredPath(storageService.getRoot().relativize(abs).toString());

        if (previewGeojson != null && !previewGeojson.isEmpty()) {
            Path previewPath = storageService.resolve("projects", projectId.toString(), "datasets", saved.getId() + ".preview.geojson");
            storageService.ensureParentDir(previewPath);
            try (InputStream in = previewGeojson.getInputStream()) {
                writeWithSha256(in, previewPath);
            } catch (IOException ex) {
                throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "STORAGE_ERROR", "Failed to store GeoJSON preview");
            }
            saved.setPreviewGeojsonPath(storageService.getRoot().relativize(previewPath).toString());
        } else {
            byte[] generated = null;
            try (InputStream in = file.getInputStream()) {
                generated = geospatialImportService.tryConvertToGeoJsonPreview(saved.getFormat(), in);
            } catch (IOException ignored) {
                generated = null;
            }

            if (generated != null && generated.length > 0) {
                Path previewPath = storageService.resolve("projects", projectId.toString(), "datasets", saved.getId() + ".preview.geojson");
                storageService.ensureParentDir(previewPath);
                try {
                    Files.write(previewPath, generated);
                } catch (IOException ex) {
                    throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "STORAGE_ERROR", "Failed to store generated GeoJSON preview");
                }
                saved.setPreviewGeojsonPath(storageService.getRoot().relativize(previewPath).toString());
            }
        }

        saved = datasetRepository.save(saved);

        auditService.log(actor, "DATASET_UPLOADED", "Dataset", saved.getId());
        return toDto(saved);
    }

    public DatasetEntity require(UUID datasetId) {
        return datasetRepository.findById(datasetId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Dataset not found"));
    }

    public DatasetEntity requireAccessible(UserEntity actor, UUID datasetId) {
        DatasetEntity dataset = require(datasetId);
        projectAccessService.requireProjectRead(actor, dataset.getProject().getId());
        return dataset;
    }

    public Path resolvePath(DatasetEntity dataset) {
        return storageService.getRoot().resolve(dataset.getStoredPath()).normalize();
    }

    public Path resolveExistingPath(DatasetEntity dataset) {
        Path path = resolvePath(dataset);
        if (!Files.exists(path)) {
            throw new ApiException(HttpStatus.NOT_FOUND, "FILE_NOT_FOUND", "Dataset file not found");
        }
        return path;
    }

    public String readGeoJson(DatasetEntity dataset) {
        Path path = resolveGeoJsonExistingPath(dataset);
        try {
            return Files.readString(path, StandardCharsets.UTF_8);
        } catch (IOException ex) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "READ_ERROR", "Unable to read dataset GeoJSON");
        }
    }

    public Path resolveGeoJsonExistingPath(DatasetEntity dataset) {
        Path candidate = null;
        if (dataset.getPreviewGeojsonPath() != null && !dataset.getPreviewGeojsonPath().isBlank()) {
            candidate = storageService.getRoot().resolve(dataset.getPreviewGeojsonPath()).normalize();
        } else {
            candidate = resolvePath(dataset);
        }

        if (!Files.exists(candidate)) {
            throw new ApiException(HttpStatus.NOT_FOUND, "FILE_NOT_FOUND", "GeoJSON file not found");
        }

        String lower = candidate.getFileName().toString().toLowerCase();
        if (!lower.endsWith(".geojson") && !lower.endsWith(".json")) {
            throw new ApiException(HttpStatus.UNSUPPORTED_MEDIA_TYPE, "UNSUPPORTED_FORMAT", "GeoJSON preview is not available for this dataset");
        }
        return candidate;
    }

    @Transactional
    public DatasetDtos.DatasetDto saveGeoJsonVersion(UserEntity actor, UUID datasetId, DatasetDtos.SaveGeoJsonVersionRequest req) {
        DatasetEntity base = requireAccessible(actor, datasetId);
        UUID projectId = base.getProject().getId();
        projectAccessService.requireProjectWrite(actor, projectId);

        String name = req.name() == null || req.name().isBlank() ? base.getName() : req.name().trim();
        String geojsonStr;
        try {
            geojsonStr = objectMapper.writeValueAsString(req.geojson());
        } catch (Exception ex) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_GEOJSON", "Invalid GeoJSON payload");
        }

        byte[] bytes = geojsonStr.getBytes(StandardCharsets.UTF_8);

        DatasetEntity dataset = new DatasetEntity();
        dataset.setProject(base.getProject());
        dataset.setName(name);
        dataset.setType(base.getType());
        dataset.setVersion(nextVersion(projectId, name, base.getType()));
        dataset.setFormat("GEOJSON");
        dataset.setOriginalFilename(sanitizeFilename(name) + "-v" + dataset.getVersion() + ".geojson");
        dataset.setContentType("application/geo+json");
        dataset.setSizeBytes(bytes.length);
        dataset.setStoredPath("PENDING");
        dataset.setChecksumSha256(sha256Hex(bytes));

        DatasetEntity saved = datasetRepository.save(dataset);

        Path abs = storageService.resolve("projects", projectId.toString(), "datasets", saved.getId() + ".geojson");
        storageService.ensureParentDir(abs);
        try {
            Files.write(abs, bytes);
        } catch (IOException ex) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "STORAGE_ERROR", "Failed to store GeoJSON");
        }
        saved.setStoredPath(storageService.getRoot().relativize(abs).toString());
        saved = datasetRepository.save(saved);

        auditService.log(actor, "DATASET_VERSION_SAVED", "Dataset", saved.getId());
        return toDto(saved);
    }

    @Transactional
    public void delete(UserEntity actor, UUID datasetId) {
        DatasetEntity dataset = requireAccessible(actor, datasetId);
        projectAccessService.requireProjectWrite(actor, dataset.getProject().getId());
        Path path = resolvePath(dataset);
        Path preview = null;
        if (dataset.getPreviewGeojsonPath() != null && !dataset.getPreviewGeojsonPath().isBlank()) {
            preview = storageService.getRoot().resolve(dataset.getPreviewGeojsonPath()).normalize();
        }
        datasetRepository.delete(dataset);

        try {
            Files.deleteIfExists(path);
            if (preview != null) {
                Files.deleteIfExists(preview);
            }
        } catch (IOException ignored) {
            // Best effort. The DB record is the source of truth; a leftover file is non-critical.
        }

        auditService.log(actor, "DATASET_DELETED", "Dataset", datasetId);
    }

    private DatasetDtos.DatasetDto toDto(DatasetEntity d) {
        return new DatasetDtos.DatasetDto(
                d.getId(),
                d.getProject().getId(),
                d.getName(),
                d.getType(),
                d.getVersion(),
                d.getFormat(),
                d.getPreviewGeojsonPath() != null && !d.getPreviewGeojsonPath().isBlank(),
                d.getOriginalFilename(),
                d.getContentType(),
                d.getSizeBytes(),
                d.getChecksumSha256(),
                d.getUploadedAt()
        );
    }

    private String guessExtension(String filename) {
        if (filename == null) {
            return ".geojson";
        }
        String lower = filename.toLowerCase();
        if (lower.endsWith(".json")) {
            return ".json";
        }
        if (lower.endsWith(".geojson")) {
            return ".geojson";
        }
        return ".geojson";
    }

    private int nextVersion(UUID projectId, String name, rw.venus.geosmartmanager.domain.DatasetType type) {
        return datasetRepository.findTopByProjectIdAndNameAndTypeOrderByVersionDesc(projectId, name, type)
                .map(d -> d.getVersion() + 1)
                .orElse(1);
    }

    private String detectFormat(String filename) {
        if (filename == null) {
            return null;
        }
        String lower = filename.toLowerCase();
        if (lower.endsWith(".geojson") || lower.endsWith(".json")) return "GEOJSON";
        if (lower.endsWith(".kml")) return "KML";
        if (lower.endsWith(".kmz")) return "KMZ";
        if (lower.endsWith(".zip")) return "SHAPEFILE_ZIP";
        if (lower.endsWith(".dxf")) return "DXF";
        if (lower.endsWith(".csv")) return "CSV";
        if (lower.endsWith(".gpx")) return "GPX";
        return null;
    }

    private String writeWithSha256(InputStream in, Path out) throws IOException {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            try (DigestInputStream dis = new DigestInputStream(in, md)) {
                Files.copy(dis, out, java.nio.file.StandardCopyOption.REPLACE_EXISTING);
            }
            return HexFormat.of().formatHex(md.digest());
        } catch (Exception ex) {
            Files.copy(in, out, java.nio.file.StandardCopyOption.REPLACE_EXISTING);
            return null;
        }
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
            return "dataset";
        }
        String s = filename.replace("\\", "/");
        int idx = s.lastIndexOf('/');
        if (idx >= 0) {
            s = s.substring(idx + 1);
        }
        s = s.replaceAll("[^A-Za-z0-9._-]", "_");
        if (s.length() > 80) {
            s = s.substring(s.length() - 80);
        }
        if (s.isBlank()) {
            return "dataset";
        }
        return s;
    }
}
