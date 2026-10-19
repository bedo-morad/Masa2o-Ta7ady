package com.ta7ady.backend.service;

import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ScoresheetValidationTest {

    static List<String> lineup(String prefix) {
        List<String> lineup = new ArrayList<>();
        for (int i = 1; i <= 11; i++) {
            lineup.add(prefix + " " + String.format("%02d", i));
        }
        return lineup;
    }

    @Test
    void validMatchPasses() {
        assertTrue(ScoresheetService.validate("Final match 2022", "Team Alpha", "Team Beta",
                lineup("Side A"), lineup("Side B")).isEmpty());
    }

    @Test
    void rejectsShortLineups() {
        List<String> errors = ScoresheetService.validate("Final match 2022", "Team Alpha", "Team Beta",
                lineup("Side A").subList(0, 10), lineup("Side B"));
        assertTrue(errors.stream().anyMatch(e -> e.contains("lineupA") && e.contains("exactly 11")));
    }

    @Test
    void rejectsLongLineups() {
        List<String> tooMany = lineup("Side A");
        tooMany.add("Extra Player");
        List<String> errors = ScoresheetService.validate("Final match 2022", "Team Alpha", "Team Beta",
                tooMany, lineup("Side B"));
        assertTrue(errors.stream().anyMatch(e -> e.contains("lineupA") && e.contains("exactly 11")));
    }

    @Test
    void rejectsNullLineups() {
        List<String> errors = ScoresheetService.validate("Final match 2022", "Team Alpha", "Team Beta",
                null, lineup("Side B"));
        assertTrue(errors.stream().anyMatch(e -> e.contains("lineupA")));
    }

    @Test
    void rejectsDuplicatesWithinOneSide() {
        List<String> lineupA = lineup("Side A");
        lineupA.set(10, lineupA.get(0).toUpperCase());
        List<String> errors = ScoresheetService.validate("Final match 2022", "Team Alpha", "Team Beta",
                lineupA, lineup("Side B"));
        assertTrue(errors.stream().anyMatch(e -> e.contains("lineupA") && e.contains("duplicate")));
    }

    @Test
    void allowsSameNameAcrossSides() {
        List<String> lineupA = lineup("Shared");
        List<String> lineupB = lineup("Shared");
        assertTrue(ScoresheetService.validate("Final match 2022", "Team Alpha", "Team Beta",
                lineupA, lineupB).isEmpty());
    }

    @Test
    void rejectsShortOrEmptyNames() {
        List<String> lineupA = lineup("Side A");
        lineupA.set(0, " ");
        lineupA.set(1, "ab");
        List<String> errors = ScoresheetService.validate("M", "TA", "  ",
                lineupA, lineup("Side B"));
        assertTrue(errors.stream().anyMatch(e -> e.contains("match")));
        assertTrue(errors.stream().anyMatch(e -> e.contains("teamA")));
        assertTrue(errors.stream().anyMatch(e -> e.contains("teamB")));
        assertEquals(2, errors.stream().filter(e -> e.contains("lineupA")).count());
    }

    @Test
    void countClampDefaults() {
        assertEquals(1, ScoresheetService.normalizeCount(0));
        assertEquals(1, ScoresheetService.normalizeCount(-3));
        assertEquals(1, ScoresheetService.normalizeCount(1));
        assertEquals(5, ScoresheetService.normalizeCount(5));
        assertEquals(10, ScoresheetService.normalizeCount(11));
        assertEquals(10, ScoresheetService.normalizeCount(500));
    }
}
