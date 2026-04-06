package rw.venus.geosmartmanager.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import rw.venus.geosmartmanager.domain.ComplianceStatus;

import java.time.Instant;

@Entity
@Table(name = "compliance_checks")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ComplianceCheckEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "project_id")
    private ProjectEntity project;

    @ManyToOne(optional = false)
    @JoinColumn(name = "subdivision_run_id")
    private SubdivisionRunEntity subdivisionRun;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ComplianceStatus status;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String findings;

    @Column(columnDefinition = "TEXT")
    private String detailsJson;

    @Column(length = 120)
    private String frameworkVersion;

    @Column(nullable = false)
    private Instant checkedAt;
}
