package rw.venus.geosmartmanager.entity;

import rw.venus.geosmartmanager.domain.ComplianceStatus;
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
@Table(name = "compliance_checks")
public class ComplianceCheckEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "project_id", nullable = false)
    private ProjectEntity project;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "subdivision_run_id", nullable = false)
    private SubdivisionRunEntity subdivisionRun;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private ComplianceStatus status = ComplianceStatus.PASSED;

    @Column(columnDefinition = "CLOB")
    private String issuesJson;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private Instant checkedAt;

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

    public SubdivisionRunEntity getSubdivisionRun() {
        return subdivisionRun;
    }

    public void setSubdivisionRun(SubdivisionRunEntity subdivisionRun) {
        this.subdivisionRun = subdivisionRun;
    }

    public ComplianceStatus getStatus() {
        return status;
    }

    public void setStatus(ComplianceStatus status) {
        this.status = status;
    }

    public String getIssuesJson() {
        return issuesJson;
    }

    public void setIssuesJson(String issuesJson) {
        this.issuesJson = issuesJson;
    }

    public Instant getCheckedAt() {
        return checkedAt;
    }
}

