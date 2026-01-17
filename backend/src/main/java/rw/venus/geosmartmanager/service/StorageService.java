package rw.venus.geosmartmanager.service;

import rw.venus.geosmartmanager.config.AppProperties;
import rw.venus.geosmartmanager.exception.ApiException;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

@Service
public class StorageService {
    private final Path root;

    public StorageService(AppProperties appProperties) {
        this.root = Paths.get(appProperties.getStorage().getRoot()).normalize().toAbsolutePath();
    }

    public Path getRoot() {
        return root;
    }

    public Path resolve(String... parts) {
        Path p = root;
        for (String part : parts) {
            p = p.resolve(part);
        }
        return p.normalize();
    }

    public void ensureParentDir(Path filePath) {
        try {
            Path parent = filePath.getParent();
            if (parent != null) {
                Files.createDirectories(parent);
            }
        } catch (IOException ex) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "STORAGE_ERROR", "Failed to create storage folder");
        }
    }
}

