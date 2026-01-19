package rw.venus.geosmartmanager.repo;

import rw.venus.geosmartmanager.entity.ProjectMemberEntity;
import rw.venus.geosmartmanager.domain.ProjectMemberRole;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProjectMemberRepository extends JpaRepository<ProjectMemberEntity, UUID> {
    List<ProjectMemberEntity> findByProjectIdOrderByAddedAtAsc(UUID projectId);

    Optional<ProjectMemberEntity> findByProjectIdAndUserId(UUID projectId, UUID userId);

    boolean existsByProjectIdAndUserId(UUID projectId, UUID userId);

    long countByProjectIdAndRole(UUID projectId, ProjectMemberRole role);
}
