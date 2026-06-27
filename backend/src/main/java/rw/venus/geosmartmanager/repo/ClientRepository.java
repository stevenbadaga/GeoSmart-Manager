package rw.venus.geosmartmanager.repo;

import org.springframework.data.jpa.repository.JpaRepository;
import rw.venus.geosmartmanager.entity.ClientEntity;

public interface ClientRepository extends JpaRepository<ClientEntity, Long> {
    long countByKycStatus(rw.venus.geosmartmanager.domain.KycStatus status);
    java.util.Optional<ClientEntity> findByUserId(Long userId);
}
