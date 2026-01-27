package rw.venus.geosmartmanager.entity;

import rw.venus.geosmartmanager.domain.ProjectMessageVisibility;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
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
@Table(name = "project_messages")
public class ProjectMessageEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "project_id", nullable = false)
    private ProjectEntity project;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "actor_user_id")
    private UserEntity actor;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private ProjectMessageVisibility visibility = ProjectMessageVisibility.CLIENT_VISIBLE;

    @Column(columnDefinition = "text", nullable = false)
    private String message;

    private Double markerLat;

    private Double markerLon;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
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

    public UserEntity getActor() {
        return actor;
    }

    public void setActor(UserEntity actor) {
        this.actor = actor;
    }

    public ProjectMessageVisibility getVisibility() {
        return visibility;
    }

    public void setVisibility(ProjectMessageVisibility visibility) {
        this.visibility = visibility;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public Double getMarkerLat() {
        return markerLat;
    }

    public void setMarkerLat(Double markerLat) {
        this.markerLat = markerLat;
    }

    public Double getMarkerLon() {
        return markerLon;
    }

    public void setMarkerLon(Double markerLon) {
        this.markerLon = markerLon;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
