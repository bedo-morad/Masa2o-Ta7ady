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

// Risk pack (SPECV3 §3.4): one genre label + exactly 4 tiered questions, in tier
// order (5/10/20/40). Genres may duplicate across packs — only the pack as a whole
// is unique.
@Entity
@Table(name = "risk_packs")
@Getter
@Setter
@NoArgsConstructor
public class RiskPack {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "genre", nullable = false)
    private String genre;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "risk_pack_questions", joinColumns = @JoinColumn(name = "pack_id"))
    @OrderColumn(name = "tier_order")
    private List<RiskTierQuestion> questions = new ArrayList<>();

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();
}
