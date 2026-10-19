package com.ta7ady.backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;

// One tier of a Risk pack (SPECV3 §3.4): stored in tier order (5/10/20/40 points).
// No double flag and no multiple-choice options are stored — both are by design
// (the double is device-randomized, options are referee-invented).
@Embeddable
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class RiskTierQuestion {
    @Column(name = "points", nullable = false)
    private int points;

    @Column(name = "question", nullable = false)
    private String question;

    @Column(name = "answer", nullable = false)
    private String answer;

}
