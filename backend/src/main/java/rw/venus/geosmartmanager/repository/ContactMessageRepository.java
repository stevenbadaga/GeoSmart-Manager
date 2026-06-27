package rw.venus.geosmartmanager.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import rw.venus.geosmartmanager.entity.ContactMessageEntity;

import java.util.List;

public interface ContactMessageRepository extends JpaRepository<ContactMessageEntity, Long> {
    List<ContactMessageEntity> findAllByOrderByCreatedAtDesc();
    long countAllByStatus(String status);
}
