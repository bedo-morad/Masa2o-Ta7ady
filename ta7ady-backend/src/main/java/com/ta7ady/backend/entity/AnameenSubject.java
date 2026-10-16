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

// Ana Meen pool (SPECV4 §4.1): hidden subject + 5 clues ordered hard -> easy.
@Entity
@Table(name = "anameen_subjects")
@Getter
@Setter
@NoArgsConstructor
public class AnameenSubject {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "player", nullable = false)
    private String player;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "anameen_subject_clues", joinColumns = @JoinColumn(name = "subject_id"))
    @OrderColumn(name = "clue_order")
    @Column(name = "clue", nullable = false)
    private List<String> clues = new ArrayList<>();

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();
}
