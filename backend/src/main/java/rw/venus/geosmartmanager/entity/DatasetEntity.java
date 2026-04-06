package rw.venus.geosmartmanager.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import rw.venus.geosmartmanager.domain.DatasetType;
import rw.venus.geosmartmanager.domain.DatasetSourceFormat;

import java.time.Instant;

@Entity
@Table(name = "datasets")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DatasetEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "project_id")
    private ProjectEntity project;

    @Column(nullable = false)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private DatasetType type;

    @Enumerated(EnumType.STRING)
    @Column(name = "source_format", nullable = false)
    private DatasetSourceFormat sourceFormat;

    @Column(name = "source_file_name")
    private String sourceFileName;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String geoJson;

    @Column(nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}
