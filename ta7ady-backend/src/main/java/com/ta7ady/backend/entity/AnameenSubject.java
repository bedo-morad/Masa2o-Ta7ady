package com.ta7ady.backend.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.Column;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OrderColumn;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.AccessLevel;

// Ana Meen pool (SPECV4 §4.1): hidden subject + 5 clues ordered hard -> easy.
@Entity
@Table(
    name = "anameen_subjects",
    uniqueConstraints = @UniqueConstraint(
        name = "uk_anameen_subject_player_key",
        columnNames = "player_key"))
@Getter
@Setter
@NoArgsConstructor
public class AnameenSubject {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "player", nullable = false)
    private String player;

    // Case-insensitive no-duplicate pool (AUTHORING.md §2) at the DB level:
    // ddl-auto cannot build a functional index on lower(player), so the
    // service persists a lowercased shadow next to the display name and the
    // named unique index above carries the last line of defence (the
    // service's pre-check can race a concurrent twin save). Always derived
    // from the player name — write it through setPlayer only. DB-nullable so
    // ddl-auto can add the column to a populated table (rows predating V4
    // stay NULL, and NULLs never collide under a unique index); every save
    // since the column exists writes it — nullability is the service's job.
    @Setter(AccessLevel.NONE)
    @JsonIgnore
    @Column(name = "player_key")
    private String playerKey;

    /** Sets the display name and derives its lowercase key (locale-neutral,
     * safe on Arabic names that have no case anyway). */
    public void setPlayer(String player) {
        this.player = player;
        this.playerKey = player == null ? null : player.toLowerCase(Locale.ROOT);
    }

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "anameen_subject_clues", joinColumns = @JoinColumn(name = "subject_id"))
    @OrderColumn(name = "clue_order")
    @Column(name = "clue", nullable = false)
    private List<String> clues = new ArrayList<>();

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();
}
