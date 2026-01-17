package rw.venus.geosmartmanager.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

@Entity
@Table(name = "compliance_configs")
public class ComplianceConfigEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "project_id", nullable = false, unique = true)
    private ProjectEntity project;

    @Column(nullable = false)
    private double minParcelArea = 200.0;

    private Double maxParcelArea;

    private Integer expectedParcelCount;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(nullable = false)
    private Instant updatedAt;

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

    public double getMinParcelArea() {
        return minParcelArea;
    }

    public void setMinParcelArea(double minParcelArea) {
        this.minParcelArea = minParcelArea;
    }

    public Double getMaxParcelArea() {
        return maxParcelArea;
    }

    public void setMaxParcelArea(Double maxParcelArea) {
        this.maxParcelArea = maxParcelArea;
    }

    public Integer getExpectedParcelCount() {
        return expectedParcelCount;
    }

    public void setExpectedParcelCount(Integer expectedParcelCount) {
        this.expectedParcelCount = expectedParcelCount;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}

