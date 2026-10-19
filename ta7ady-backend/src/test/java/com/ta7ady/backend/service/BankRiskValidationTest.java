package com.ta7ady.backend.service;

import com.ta7ady.backend.dto.RiskQuestionRequest;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class BankRiskValidationTest {

    // ---- Bank (SPECV3 §3.2) ----

    @Test
    void bankValidPasses() {
        assertTrue(BankService.validate("من فاز بكأس العالم 2022؟", "الأرجنتين").isEmpty());
        // A short numeric answer is fine (Ihbid spirit).
        assertTrue(BankService.validate("كم كأس عالم للبرازيل؟", "5").isEmpty());
    }

    @Test
    void bankRejectsShortQuestionAndEmptyAnswer() {
        assertTrue(BankService.validate("ab", "x").stream().anyMatch(e -> e.contains("question")));
        assertTrue(BankService.validate("سؤال صحيح", "  ").stream().anyMatch(e -> e.contains("answer")));
        assertEquals(2, BankService.validate(null, null).size());
    }

    @Test
    void bankCountClampIs1To100() {
        assertEquals(1, BankService.normalizeCount(0));
        assertEquals(1, BankService.normalizeCount(-5));
        assertEquals(12, BankService.normalizeCount(12));
        assertEquals(72, BankService.normalizeCount(72));
        assertEquals(100, BankService.normalizeCount(100));
        assertEquals(100, BankService.normalizeCount(101));
        assertEquals(100, BankService.normalizeCount(500));
    }

    // ---- Risk (SPECV3 §3.4) ----

    static List<RiskQuestionRequest> pack() {
        List<RiskQuestionRequest> questions = new ArrayList<>();
        questions.add(new RiskQuestionRequest(5, "Tier five question", "five"));
        questions.add(new RiskQuestionRequest(10, "Tier ten question", "ten"));
        questions.add(new RiskQuestionRequest(20, "Tier twenty question", "twenty"));
        questions.add(new RiskQuestionRequest(40, "Tier forty question", "forty"));
        return questions;
    }

    @Test
    void riskValidPackPasses() {
        assertTrue(RiskService.validate("ريال مدريد", pack()).isEmpty());
    }

    @Test
    void riskRejectsWrongTierCount() {
        assertTrue(RiskService.validate("ريال مدريد", pack().subList(0, 3))
                .stream().anyMatch(e -> e.contains("exactly 4")));
        List<RiskQuestionRequest> five = pack();
        five.add(new RiskQuestionRequest(40, "Extra tier question", "extra"));
        assertTrue(RiskService.validate("ريال مدريد", five).stream().anyMatch(e -> e.contains("exactly 4")));
        assertTrue(RiskService.validate("ريال مدريد", null).stream().anyMatch(e -> e.contains("exactly 4")));
    }

    @Test
    void riskRejectsOutOfOrderTiers() {
        List<RiskQuestionRequest> swapped = pack();
        swapped.set(0, new RiskQuestionRequest(10, "Tier five question", "five"));
        assertTrue(RiskService.validate("ريال مدريد", swapped).stream().anyMatch(e -> e.contains("must be 5")));

        // A pack with the right questions but the wrong declared points is rejected too.
        List<RiskQuestionRequest> relabelled = pack();
        relabelled.set(2, new RiskQuestionRequest(5, "Tier twenty question", "twenty"));
        assertTrue(RiskService.validate("ريال مدريد", relabelled).stream().anyMatch(e -> e.contains("must be 20")));
    }

    @Test
    void riskRejectsDuplicateQuestions() {
        List<RiskQuestionRequest> questions = pack();
        questions.set(3, new RiskQuestionRequest(40, questions.get(0).question().toUpperCase(), "forty"));
        assertTrue(RiskService.validate("ريال مدريد", questions).stream().anyMatch(e -> e.contains("duplicate")));
    }

    @Test
    void riskRejectsShortGenreAndBlankAnswer() {
        assertTrue(RiskService.validate("ab", pack()).stream().anyMatch(e -> e.contains("genre")));
        List<RiskQuestionRequest> questions = pack();
        questions.set(1, new RiskQuestionRequest(10, "Tier ten question", " "));
        assertTrue(RiskService.validate("ريال مدريد", questions).stream().anyMatch(e -> e.contains("answer")));
    }

    @Test
    void riskCountClampIs1To12() {
        assertEquals(1, RiskService.normalizeCount(0));
        assertEquals(1, RiskService.normalizeCount(-2));
        assertEquals(4, RiskService.normalizeCount(4));
        assertEquals(12, RiskService.normalizeCount(12));
        assertEquals(12, RiskService.normalizeCount(13));
        assertEquals(12, RiskService.normalizeCount(500));
    }
}
