package rw.venus.geosmartmanager.repo;

import rw.venus.geosmartmanager.entity.ClientEntity;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ClientRepository extends JpaRepository<ClientEntity, UUID> {
    List<ClientEntity> findAllByOrderByCreatedAtDesc();
}
