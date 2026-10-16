package com.ta7ady.backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

// One tier of a Risk pack (SPECV3 §3.4): stored in tier order (5/10/20/40 points).
// No double flag and no multiple-choice options are stored — both are by design
// (the double is device-randomized, options are referee-invented).
@Embeddable
@Getter
@Setter
@NoArgsConstructor
public class RiskTierQuestion {
    @Column(name = "points", nullable = false)
    private int points;

    @Column(name = "question", nullable = false)
    private String question;

    @Column(name = "answer", nullable = false)
    private String answer;

    public RiskTierQuestion(int points, String question, String answer) {
        this.points = points;
        this.question = question;
        this.answer = answer;
    }
}
