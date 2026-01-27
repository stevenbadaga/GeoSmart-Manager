package rw.venus.geosmartmanager.repo;

import rw.venus.geosmartmanager.entity.ProjectEntity;
import java.util.Collection;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ProjectRepository extends JpaRepository<ProjectEntity, UUID> {
    List<ProjectEntity> findAllByOrderByCreatedAtDesc();

    List<ProjectEntity> findByClientIdOrderByCreatedAtDesc(UUID clientId);

    boolean existsByClientId(UUID clientId);

    List<ProjectEntity> findByClient_User_IdOrderByCreatedAtDesc(UUID userId);

    boolean existsByIdAndClient_User_Id(UUID id, UUID userId);

    @Query("""
            select p
            from ProjectEntity p
            join ProjectMemberEntity m on m.project = p
            where m.user.id = :userId
            order by p.createdAt desc
            """)
    List<ProjectEntity> findAccessibleProjects(@Param("userId") UUID userId);

    @Query("""
            select p
            from ProjectEntity p
            join ProjectMemberEntity m on m.project = p
            where m.user.id = :userId
              and p.client.id = :clientId
            order by p.createdAt desc
            """)
    List<ProjectEntity> findAccessibleProjectsByClient(@Param("userId") UUID userId, @Param("clientId") UUID clientId);

    @Query("""
            select p.id
            from ProjectEntity p
            join ProjectMemberEntity m on m.project = p
            where m.user.id = :userId
            """)
    List<UUID> findAccessibleProjectIds(@Param("userId") UUID userId);

    @Query("""
            select count(distinct p.client.id)
            from ProjectEntity p
            join ProjectMemberEntity m on m.project = p
            where m.user.id = :userId
            """)
    long countAccessibleClients(@Param("userId") UUID userId);

    long countByIdIn(Collection<UUID> ids);
}
