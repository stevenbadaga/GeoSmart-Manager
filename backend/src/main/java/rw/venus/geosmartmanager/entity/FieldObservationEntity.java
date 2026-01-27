package rw.venus.geosmartmanager.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import org.hibernate.annotations.CreationTimestamp;

@Entity
@Table(name = "field_observations")
public class FieldObservationEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "project_id", nullable = false)
    private ProjectEntity project;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by_user_id")
    private UserEntity createdBy;

    @Column(length = 255)
    private String title;

    @Column(nullable = false)
    private double latitude;

    @Column(nullable = false)
    private double longitude;

    @Column(name = "altitude_m")
    private Double altitudeM;

    @Column(name = "accuracy_m")
    private Double accuracyM;

    @Column(name = "observed_at")
    private Instant observedAt;

    @Column(columnDefinition = "text")
    private String notes;

    @Column(name = "photo_original_filename", length = 255)
    private String photoOriginalFilename;

    @Column(name = "photo_stored_path", length = 512)
    private String photoStoredPath;

    @Column(name = "photo_content_type", length = 255)
    private String photoContentType;

    @Column(name = "photo_size_bytes")
    private Long photoSizeBytes;

    @Column(name = "photo_checksum_sha256", length = 64)
    private String photoChecksumSha256;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public ProjectEntity getProject() {
        return project;
    }

    public void setProject(ProjectEntity project) {
        this.project = project;
    }

    public UserEntity getCreatedBy() {
        return createdBy;
    }

    public void setCreatedBy(UserEntity createdBy) {
        this.createdBy = createdBy;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public double getLatitude() {
        return latitude;
    }

    public void setLatitude(double latitude) {
        this.latitude = latitude;
    }

    public double getLongitude() {
        return longitude;
    }

    public void setLongitude(double longitude) {
        this.longitude = longitude;
    }

    public Double getAltitudeM() {
        return altitudeM;
    }

    public void setAltitudeM(Double altitudeM) {
        this.altitudeM = altitudeM;
    }

    public Double getAccuracyM() {
        return accuracyM;
    }

    public void setAccuracyM(Double accuracyM) {
        this.accuracyM = accuracyM;
    }

    public Instant getObservedAt() {
        return observedAt;
    }

    public void setObservedAt(Instant observedAt) {
        this.observedAt = observedAt;
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }

    public String getPhotoOriginalFilename() {
        return photoOriginalFilename;
    }

    public void setPhotoOriginalFilename(String photoOriginalFilename) {
        this.photoOriginalFilename = photoOriginalFilename;
    }

    public String getPhotoStoredPath() {
        return photoStoredPath;
    }

    public void setPhotoStoredPath(String photoStoredPath) {
        this.photoStoredPath = photoStoredPath;
    }

    public String getPhotoContentType() {
        return photoContentType;
    }

    public void setPhotoContentType(String photoContentType) {
        this.photoContentType = photoContentType;
    }

    public Long getPhotoSizeBytes() {
        return photoSizeBytes;
    }

    public void setPhotoSizeBytes(Long photoSizeBytes) {
        this.photoSizeBytes = photoSizeBytes;
    }

    public String getPhotoChecksumSha256() {
        return photoChecksumSha256;
    }

    public void setPhotoChecksumSha256(String photoChecksumSha256) {
        this.photoChecksumSha256 = photoChecksumSha256;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
