package rw.venus.geosmartmanager.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

@Entity
@Table(name = "conversation_participants")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ConversationParticipantEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "conversation_id")
    private ConversationEntity conversation;

    @Column(nullable = false)
    private Long userId;

    @Column(nullable = false)
    private String roleAtJoin;

    @Column(nullable = false)
    private Instant joinedAt;

    private Instant lastReadAt;
}
