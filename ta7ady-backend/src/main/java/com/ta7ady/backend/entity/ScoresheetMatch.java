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

@Entity
@Table(name = "scoresheet_matches")
@Getter
@Setter
@NoArgsConstructor
public class ScoresheetMatch {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "match_label", nullable = false)
    private String matchLabel;

    @Column(name = "team_a", nullable = false)
    private String teamA;

    @Column(name = "team_b", nullable = false)
    private String teamB;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "scoresheet_lineup_a", joinColumns = @JoinColumn(name = "match_id"))
    @OrderColumn(name = "player_order")
    @Column(name = "player", nullable = false)
    private List<String> lineupA = new ArrayList<>();

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "scoresheet_lineup_b", joinColumns = @JoinColumn(name = "match_id"))
    @OrderColumn(name = "player_order")
    @Column(name = "player", nullable = false)
    private List<String> lineupB = new ArrayList<>();

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();
}
