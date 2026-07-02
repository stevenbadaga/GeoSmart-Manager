package rw.venus.geosmartmanager.api.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;
import java.nio.file.*;
import java.util.*;

@RestController
public class UploadController {

    @PostMapping("/api/messages/upload")
    public ResponseEntity<?> uploadFile(@RequestParam("file") MultipartFile file) {
        if (file.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "File is empty"));
        }

        // Validate file size limit: 50MB
        long maxSize = 50 * 1024 * 1024L;
        if (file.getSize() > maxSize) {
            return ResponseEntity.badRequest().body(Map.of("message", "File is too large."));
        }

        String originalName = file.getOriginalFilename();
        String contentType = file.getContentType();
        String attachmentType = getAttachmentType(originalName, contentType);

        // Enforce supported formats
        if (attachmentType.equals("document")) {
            String lowerName = originalName != null ? originalName.toLowerCase() : "";
            if (!lowerName.endsWith(".pdf") && !lowerName.endsWith(".doc") && !lowerName.endsWith(".docx")) {
                return ResponseEntity.badRequest().body(Map.of("message", "Unsupported file type."));
            }
        } else if (!attachmentType.equals("image") && !attachmentType.equals("video") && !attachmentType.equals("audio")) {
            return ResponseEntity.badRequest().body(Map.of("message", "Unsupported file type."));
        }

        try {
            Path uploadPath = Paths.get("uploads");
            if (!Files.exists(uploadPath)) {
                Files.createDirectories(uploadPath);
            }

            // Generate unique name
            String extension = "";
            if (originalName != null && originalName.contains(".")) {
                extension = originalName.substring(originalName.lastIndexOf("."));
            }
            String uniqueName = UUID.randomUUID().toString() + extension;
            Path filePath = uploadPath.resolve(uniqueName);

            // Copy file
            Files.copy(file.getInputStream(), filePath, StandardCopyOption.REPLACE_EXISTING);

            Map<String, String> response = new HashMap<>();
            response.put("url", "/uploads/" + uniqueName);
            response.put("name", originalName);
            response.put("type", attachmentType);
            response.put("size", String.valueOf(file.getSize()));
            response.put("mimeType", contentType);

            return ResponseEntity.ok(response);
        } catch (IOException e) {
            return ResponseEntity.internalServerError().body(Map.of("message", "Upload failed. Please try again."));
        }
    }

    private String getAttachmentType(String fileName, String contentType) {
        if (contentType == null) contentType = "";
        contentType = contentType.toLowerCase();
        if (fileName == null) fileName = "";
        fileName = fileName.toLowerCase();

        if (contentType.startsWith("image/") || fileName.endsWith(".png") || fileName.endsWith(".jpg") || fileName.endsWith(".jpeg") || fileName.endsWith(".webp") || fileName.endsWith(".gif")) {
            return "image";
        } else if (contentType.startsWith("video/") || fileName.endsWith(".mp4") || fileName.endsWith(".webm") || fileName.endsWith(".mov")) {
            return "video";
        } else if (contentType.startsWith("audio/") || fileName.endsWith(".mp3") || fileName.endsWith(".wav") || fileName.endsWith(".ogg") || fileName.endsWith(".webm") || fileName.endsWith(".m4a")) {
            return "audio";
        } else {
            return "document";
        }
    }
}
