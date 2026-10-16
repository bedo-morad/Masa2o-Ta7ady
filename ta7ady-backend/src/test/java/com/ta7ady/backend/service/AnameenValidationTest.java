package com.ta7ady.backend.service;

import java.util.List;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class AnameenValidationTest {

    static List<String> clues5(String prefix) {
        return List.of(prefix + " club one", prefix + " club two", prefix + " club three",
                prefix + " club four", prefix + " club five");
    }

    // ---- 5-clue enforcement (SPECV4 §4.1) ----

    @Test
    void validSubjectPasses() {
        assertTrue(AnameenService.validate("أشرف حكيمي", clues5("Valid")).isEmpty());
    }

    @Test
    void rejectsWrongClueCount() {
        List<String> four = clues5("Count").subList(0, 4);
        assertTrue(AnameenService.validate("أشرف حكيمي", four)
                .stream().anyMatch(e -> e.contains("exactly 5")));
        List<String> six = List.of("one clue here", "two clue here", "three clue here",
                "four clue here", "five clue here", "six clue here");
        assertTrue(AnameenService.validate("أشرف حكيمي", six)
                .stream().anyMatch(e -> e.contains("exactly 5")));
        assertTrue(AnameenService.validate("أشرف حكيمي", null)
                .stream().anyMatch(e -> e.contains("exactly 5")));
    }

    @Test
    void rejectsShortOrBlankClues() {
        List<String> shortOne = List.of("long first clue", "long second clue", "long third clue",
                "long fourth clue", "ab");
        assertTrue(AnameenService.validate("أشرف حكيمي", shortOne)
                .stream().anyMatch(e -> e.contains("clue 5")));
        // Blank after trimming is still rejected (non-empty trimmed rule).
        List<String> blank = List.of("long first clue", "long second clue", "long third clue",
                "long fourth clue", "   ");
        assertTrue(AnameenService.validate("أشرف حكيمي", blank)
                .stream().anyMatch(e -> e.contains("clue 5")));
    }

    @Test
    void rejectsDuplicateCluesCaseInsensitively() {
        List<String> dup = List.of("long first clue", "long second clue", "long third clue",
                "long fourth clue", "LONG FIRST CLUE");
        assertTrue(AnameenService.validate("أشرف حكيمي", dup)
                .stream().anyMatch(e -> e.contains("duplicate")));
    }

    @Test
    void rejectsShortPlayer() {
        assertTrue(AnameenService.validate("ab", clues5("Player"))
                .stream().anyMatch(e -> e.contains("player")));
        assertEquals(1, AnameenService.validate(null, clues5("Player")).size());
    }

    // ---- count default/clamp rail (draw default 3 comes from the controller param) ----

    @Test
    void countClampIs1To10() {
        assertEquals(1, AnameenService.normalizeCount(0));
        assertEquals(1, AnameenService.normalizeCount(-3));
        assertEquals(3, AnameenService.normalizeCount(3));
        assertEquals(10, AnameenService.normalizeCount(10));
        assertEquals(10, AnameenService.normalizeCount(11));
        assertEquals(10, AnameenService.normalizeCount(500));
    }
}
