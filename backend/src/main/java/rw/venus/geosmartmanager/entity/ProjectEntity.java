package rw.venus.geosmartmanager.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import rw.venus.geosmartmanager.domain.ProjectStatus;

import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "projects")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProjectEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String code;

    @Column(nullable = false)
    private String name;

    @Column(name = "project_type", length = 120)
    private String projectType;

    @Column(name = "location_summary")
    private String locationSummary;

    @Column(name = "scope_summary", columnDefinition = "TEXT")
    private String scopeSummary;

    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ProjectStatus status;

    private LocalDate startDate;

    private LocalDate endDate;

    @ManyToOne(optional = false)
    @JoinColumn(name = "client_id")
    private ClientEntity client;

    @Column(name = "assigned_surveyor_id")
    private Long assignedSurveyorId;

    @Column(name = "requested_upi", length = 120)
    private String requestedUpi;

    @Column(name = "requested_parcel_count")
    private Integer requestedParcelCount;

    @Column(name = "requested_land_use", length = 120)
    private String requestedLandUse;

    @Column(name = "intake_notes", columnDefinition = "TEXT")
    private String intakeNotes;

    @Column(name = "approved_at")
    private Instant approvedAt;

    @Column(name = "surveyor_accepted_at")
    private Instant surveyorAcceptedAt;

    @Column(name = "subdivision_drafted_at")
    private Instant subdivisionDraftedAt;

    @Column(name = "compliance_checked_at")
    private Instant complianceCheckedAt;

    @Column(name = "report_ready_at")
    private Instant reportReadyAt;

    @Column(name = "archived_at")
    private Instant archivedAt;

    @Column(nullable = false)
    private Instant createdAt;
}
