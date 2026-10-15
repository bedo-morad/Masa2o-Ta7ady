package com.ta7ady.backend.service;

import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class Top10ValidationTest {

    static List<String> answers13() {
        List<String> answers = new ArrayList<>();
        for (int i = 1; i <= 13; i++) {
            answers.add("Answer " + String.format("%02d", i));
        }
        return answers;
    }

    @Test
    void validListPasses() {
        assertTrue(Top10Service.validate("Top scorers ever", answers13()).isEmpty());
    }

    @Test
    void rejectsFewerThan13() {
        List<String> errors = Top10Service.validate("Top scorers ever", answers13().subList(0, 12));
        assertTrue(errors.stream().anyMatch(e -> e.contains("exactly 13")));
    }

    @Test
    void rejectsMoreThan13() {
        List<String> answers = answers13();
        answers.add("Answer 14");
        List<String> errors = Top10Service.validate("Top scorers ever", answers);
        assertTrue(errors.stream().anyMatch(e -> e.contains("exactly 13")));
    }

    @Test
    void rejectsNullAnswers() {
        List<String> errors = Top10Service.validate("Top scorers ever", null);
        assertTrue(errors.stream().anyMatch(e -> e.contains("exactly 13")));
    }

    @Test
    void rejectsEmptyAndShortAnswers() {
        List<String> answers = answers13();
        answers.set(0, "  ");
        answers.set(5, "ab");
        List<String> errors = Top10Service.validate("Top scorers ever", answers);
        assertEquals(2, errors.size());
    }

    @Test
    void rejectsDuplicatesCaseInsensitively() {
        List<String> answers = answers13();
        answers.set(12, answers.get(0).toUpperCase());
        List<String> errors = Top10Service.validate("Top scorers ever", answers);
        assertTrue(errors.stream().anyMatch(e -> e.contains("duplicate")));
    }

    @Test
    void rejectsShortPrompt() {
        assertTrue(Top10Service.validate("ab", answers13()).stream().anyMatch(e -> e.contains("prompt")));
        assertTrue(Top10Service.validate(null, answers13()).stream().anyMatch(e -> e.contains("prompt")));
    }

    @Test
    void trimsBeforeComparing() {
        List<String> answers = answers13();
        answers.set(12, "  " + answers.get(0) + "  ");
        List<String> errors = Top10Service.validate("Top scorers ever", answers);
        assertTrue(errors.stream().anyMatch(e -> e.contains("duplicate")));
    }

    @Test
    void countClampDefaults() {
        assertEquals(1, Top10Service.normalizeCount(0));
        assertEquals(1, Top10Service.normalizeCount(-5));
        assertEquals(1, Top10Service.normalizeCount(1));
        assertEquals(10, Top10Service.normalizeCount(10));
        assertEquals(50, Top10Service.normalizeCount(51));
        assertEquals(50, Top10Service.normalizeCount(500));
    }
}
