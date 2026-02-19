package rw.venus.geosmartmanager.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import rw.venus.geosmartmanager.domain.SubdivisionOptimizationMode;
import rw.venus.geosmartmanager.domain.SubdivisionStatus;

import java.time.Instant;

@Entity
@Table(name = "subdivision_runs")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SubdivisionRunEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "project_id")
    private ProjectEntity project;

    @ManyToOne(optional = false)
    @JoinColumn(name = "dataset_id")
    private DatasetEntity dataset;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private SubdivisionStatus status;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private SubdivisionOptimizationMode optimizationMode;

    @Column(nullable = false)
    private int parcelCount;

    @Column(nullable = false)
    private double avgParcelAreaSqm;

    @Column(nullable = false)
    private double qualityScore;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String resultGeoJson;

    @Column(nullable = false)
    private Instant createdAt;
}
