package rw.venus.geosmartmanager.service;

import rw.venus.geosmartmanager.api.dto.ProjectDocumentDtos;
import rw.venus.geosmartmanager.entity.ProjectDocumentEntity;
import rw.venus.geosmartmanager.entity.ProjectEntity;
import rw.venus.geosmartmanager.entity.UserEntity;
import rw.venus.geosmartmanager.exception.ApiException;
import rw.venus.geosmartmanager.repo.ProjectDocumentRepository;
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
public class ProjectDocumentService {
    private final ProjectRepository projectRepository;
    private final ProjectDocumentRepository projectDocumentRepository;
    private final StorageService storageService;
    private final ProjectAccessService projectAccessService;
    private final AuditService auditService;

    public ProjectDocumentService(
            ProjectRepository projectRepository,
            ProjectDocumentRepository projectDocumentRepository,
            StorageService storageService,
            ProjectAccessService projectAccessService,
            AuditService auditService
    ) {
        this.projectRepository = projectRepository;
        this.projectDocumentRepository = projectDocumentRepository;
        this.storageService = storageService;
        this.projectAccessService = projectAccessService;
        this.auditService = auditService;
    }

    @Transactional(readOnly = true)
    public List<ProjectDocumentDtos.DocumentDto> list(UserEntity actor, UUID projectId) {
        projectAccessService.requireProjectRead(actor, projectId);
        return projectDocumentRepository.findByProjectIdOrderByUploadedAtDesc(projectId)
                .stream()
                .map(this::toDto)
                .toList();
    }

    @Transactional
    public ProjectDocumentDtos.DocumentDto upload(
            UserEntity actor,
            UUID projectId,
            ProjectDocumentDtos.UploadDocumentMetadata meta,
            MultipartFile file
    ) {
        projectAccessService.requireProjectWrite(actor, projectId);

        ProjectEntity project = projectRepository.findById(projectId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Project not found"));

        if (file == null || file.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_FILE", "File is required");
        }

        ProjectDocumentEntity doc = new ProjectDocumentEntity();
        doc.setProject(project);
        doc.setUploadedBy(actor);
        doc.setDocType(meta.docType());
        doc.setName(meta.name());
        doc.setOriginalFilename(file.getOriginalFilename() == null ? "upload.bin" : file.getOriginalFilename());
        doc.setContentType(file.getContentType());
        doc.setSizeBytes(file.getSize());
        doc.setStoredPath("PENDING");
        ProjectDocumentEntity saved = projectDocumentRepository.save(doc);

        String safeName = sanitizeFilename(saved.getOriginalFilename());
        String ext = extensionOf(safeName);
        Path abs = storageService.resolve("projects", projectId.toString(), "documents", saved.getId() + ext);
        storageService.ensureParentDir(abs);

        byte[] bytes;
        try {
            bytes = file.getBytes();
            Files.write(abs, bytes);
        } catch (IOException ex) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "STORAGE_ERROR", "Failed to store document");
        }

        saved.setStoredPath(storageService.getRoot().relativize(abs).toString());
        saved.setChecksumSha256(sha256Hex(bytes));
        saved = projectDocumentRepository.save(saved);

        auditService.log(actor, "PROJECT_DOCUMENT_UPLOADED", "ProjectDocument", saved.getId());
        return toDto(saved);
    }

    @Transactional(readOnly = true)
    public ProjectDocumentEntity requireAccessible(UserEntity actor, UUID projectId, UUID docId) {
        projectAccessService.requireProjectRead(actor, projectId);
        return projectDocumentRepository.findByIdAndProjectId(docId, projectId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Document not found"));
    }

    public Path resolveExistingPath(ProjectDocumentEntity doc) {
        Path p = storageService.getRoot().resolve(doc.getStoredPath()).normalize();
        if (!Files.exists(p)) {
            throw new ApiException(HttpStatus.NOT_FOUND, "FILE_NOT_FOUND", "Document file not found");
        }
        return p;
    }

    @Transactional
    public void delete(UserEntity actor, UUID projectId, UUID docId) {
        projectAccessService.requireProjectWrite(actor, projectId);
        ProjectDocumentEntity doc = requireAccessible(actor, projectId, docId);
        Path p = storageService.getRoot().resolve(doc.getStoredPath()).normalize();
        projectDocumentRepository.delete(doc);
        try {
            Files.deleteIfExists(p);
        } catch (IOException ignored) {
            // best effort
        }
        auditService.log(actor, "PROJECT_DOCUMENT_DELETED", "ProjectDocument", docId);
    }

    private ProjectDocumentDtos.DocumentDto toDto(ProjectDocumentEntity d) {
        return new ProjectDocumentDtos.DocumentDto(
                d.getId(),
                d.getProject().getId(),
                d.getDocType(),
                d.getName(),
                d.getOriginalFilename(),
                d.getContentType(),
                d.getSizeBytes(),
                d.getChecksumSha256(),
                d.getUploadedBy() == null ? null : d.getUploadedBy().getUsername(),
                d.getUploadedAt()
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

