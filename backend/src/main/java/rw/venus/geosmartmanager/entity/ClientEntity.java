package rw.venus.geosmartmanager.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import org.hibernate.annotations.CreationTimestamp;

@Entity
@Table(name = "clients")
public class ClientEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, length = 255)
    private String name;

    @Column(length = 255)
    private String email;

    @Column(length = 64)
    private String phone;

    @Column(length = 512)
    private String address;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private UserEntity user;

    @Column(length = 64)
    private String kycIdType;

    @Column(length = 128)
    private String kycIdNumber;

    @Column(length = 1000)
    private String kycNotes;

    @Column(length = 2000)
    private String landOwnershipDetails;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getPhone() {
        return phone;
    }

    public void setPhone(String phone) {
        this.phone = phone;
    }

    public String getAddress() {
        return address;
    }

    public void setAddress(String address) {
        this.address = address;
    }

    public UserEntity getUser() {
        return user;
    }

    public void setUser(UserEntity user) {
        this.user = user;
    }

    public String getKycIdType() {
        return kycIdType;
    }

    public void setKycIdType(String kycIdType) {
        this.kycIdType = kycIdType;
    }

    public String getKycIdNumber() {
        return kycIdNumber;
    }

    public void setKycIdNumber(String kycIdNumber) {
        this.kycIdNumber = kycIdNumber;
    }

    public String getKycNotes() {
        return kycNotes;
    }

    public void setKycNotes(String kycNotes) {
        this.kycNotes = kycNotes;
    }

    public String getLandOwnershipDetails() {
        return landOwnershipDetails;
    }

    public void setLandOwnershipDetails(String landOwnershipDetails) {
        this.landOwnershipDetails = landOwnershipDetails;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
