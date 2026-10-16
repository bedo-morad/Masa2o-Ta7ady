package com.ta7ady.backend.entity;

import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OrderColumn;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

// Who-in-Picture photo (SPECV4 §4.3): one hotlinked team photo + exactly the 11
// pictured names, any order. Hotlinks only in v4 — no upload endpoint, no storage.
@Entity
@Table(name = "whopicture_photos")
@Getter
@Setter
@NoArgsConstructor
public class WhoPicturePhoto {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "photo_url", nullable = false)
    private String photoUrl;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "whopicture_players", joinColumns = @JoinColumn(name = "photo_id"))
    @OrderColumn(name = "player_order")
    @Column(name = "player", nullable = false)
    private List<String> players = new ArrayList<>();

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();
}
