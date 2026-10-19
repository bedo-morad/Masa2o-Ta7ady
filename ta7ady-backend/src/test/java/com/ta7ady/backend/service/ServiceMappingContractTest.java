package com.ta7ady.backend.service;

import com.ta7ady.backend.dto.AnameenBulkRow;
import com.ta7ady.backend.dto.RiskBulkRow;
import com.ta7ady.backend.dto.RiskQuestionRequest;
import com.ta7ady.backend.dto.ScoresheetBulkRow;
import com.ta7ady.backend.dto.Top10BulkRow;
import java.util.List;
import java.util.stream.IntStream;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

@SpringBootTest
@Transactional
class ServiceMappingContractTest {
    @Autowired
    Top10Service top10;
    @Autowired
    ScoresheetService scoresheet;
    @Autowired
    AnameenService anameen;
    @Autowired
    RiskService risk;

    private static List<String> names(String prefix, int count) {
        return IntStream.rangeClosed(1, count).mapToObj(i -> "  " + prefix + " " + i + "  ").toList();
    }

    @Test
    void top10CreateUpdateAndBulkTrimWithoutReorderingOrAppendingAnswers() {
        var created = top10.create("  Mapping top ten  ", names("First", 13));
        assertEquals("Mapping top ten", created.getPrompt());
        assertEquals("First 1", created.getAnswers().get(0));
        var updated = top10.update(created.getId(), "  Mapping edited  ", names("Edited", 13));
        assertEquals(created.getId(), updated.getId());
        assertEquals("Mapping edited", updated.getPrompt());
        assertEquals(13, updated.getAnswers().size());
        assertEquals("Edited 1", updated.getAnswers().get(0));
        assertEquals("Edited 13", updated.getAnswers().get(12));
        var imported = top10.bulk(List.of(new Top10BulkRow("  Mapping imported  ", names("Bulk", 13))), false);
        var saved = top10.all(Pageable.unpaged()).stream()
                .filter(row -> row.getId().equals(imported.get(0).id())).findFirst().orElseThrow();
        assertEquals("Mapping imported", saved.getPrompt());
        assertEquals("Bulk 1", saved.getAnswers().get(0));
        assertEquals("Bulk 13", saved.getAnswers().get(12));
    }

    @Test
    void scoresheetMappingKeepsBothLineupsSeparateAndOrderedAcrossWrites() {
        var created = scoresheet.create("  Mapping final  ", "  Alpha team  ", "  Bravo team  ",
                names("Alpha", 11), names("Bravo", 11));
        assertEquals("Mapping final", created.getMatchLabel());
        assertEquals("Alpha team", created.getTeamA());
        assertEquals("Bravo team", created.getTeamB());
        var updated = scoresheet.update(created.getId(), "  Edited final  ", "  Charlie team  ",
                "  Delta team  ", names("Charlie", 11), names("Delta", 11));
        assertEquals("Edited final", updated.getMatchLabel());
        assertEquals("Charlie team", updated.getTeamA());
        assertEquals("Delta team", updated.getTeamB());
        assertEquals(11, updated.getLineupA().size());
        assertEquals(11, updated.getLineupB().size());
        assertEquals("Charlie 1", updated.getLineupA().get(0));
        assertEquals("Delta 11", updated.getLineupB().get(10));
        var imported = scoresheet.bulk(List.of(new ScoresheetBulkRow("  Imported final  ",
                "  Echo team  ", "  Foxtrot team  ", names("Echo", 11), names("Foxtrot", 11))), false);
        var saved = scoresheet.all(Pageable.unpaged()).stream()
                .filter(row -> row.getId().equals(imported.get(0).id())).findFirst().orElseThrow();
        assertEquals("Imported final", saved.getMatchLabel());
        assertEquals("Echo team", saved.getTeamA());
        assertEquals("Foxtrot team", saved.getTeamB());
        assertEquals("Echo 1", saved.getLineupA().get(0));
        assertEquals("Foxtrot 11", saved.getLineupB().get(10));
    }

    @Test
    void subjectMappingKeepsClueOrderAndCaseInsensitiveDuplicateProtection() {
        var created = anameen.create("  Mapping subject  ", names("Clue", 5));
        assertEquals("Mapping subject", created.getPlayer());
        assertEquals("Clue 1", created.getClues().get(0));
        var updated = anameen.update(created.getId(), "  Edited subject  ", names("Edited clue", 5));
        assertEquals("Edited subject", updated.getPlayer());
        assertEquals(5, updated.getClues().size());
        assertEquals("Edited clue 1", updated.getClues().get(0));
        assertEquals("Edited clue 5", updated.getClues().get(4));
        var conflict = assertThrows(ResponseStatusException.class,
                () -> anameen.create("  EDITED SUBJECT  ", names("Other clue", 5)));
        assertEquals(HttpStatus.CONFLICT, conflict.getStatusCode());
        var imported = anameen.bulk(List.of(new AnameenBulkRow("  Imported subject  ", names("Bulk clue", 5))), false);
        var saved = anameen.all(Pageable.unpaged()).stream()
                .filter(row -> row.getId().equals(imported.get(0).id())).findFirst().orElseThrow();
        assertEquals("Imported subject", saved.getPlayer());
        assertEquals("Bulk clue 5", saved.getClues().get(4));
    }

    private static List<RiskQuestionRequest> tiers(String prefix) {
        return List.of(5, 10, 20, 40).stream().map(points -> new RiskQuestionRequest(points,
                "  " + prefix + " question " + points + "  ", "  " + prefix + " answer " + points + "  ")).toList();
    }

    @Test
    void riskMappingTrimsNestedTiersAndReplacesRatherThanAppendsThem() {
        var created = risk.create("  Mapping genre  ", tiers("First"));
        assertEquals("Mapping genre", created.getGenre());
        assertEquals("First question 5", created.getQuestions().get(0).getQuestion());
        var updated = risk.update(created.getId(), "  Edited genre  ", tiers("Edited"));
        assertEquals("Edited genre", updated.getGenre());
        assertEquals(4, updated.getQuestions().size());
        assertEquals(List.of(5, 10, 20, 40), updated.getQuestions().stream().map(q -> q.getPoints()).toList());
        assertEquals("Edited question 5", updated.getQuestions().get(0).getQuestion());
        assertEquals("Edited answer 40", updated.getQuestions().get(3).getAnswer());
        var imported = risk.bulk(List.of(new RiskBulkRow("  Imported genre  ", tiers("Bulk"))), false);
        var saved = risk.all(Pageable.unpaged()).stream()
                .filter(row -> row.getId().equals(imported.get(0).id())).findFirst().orElseThrow();
        assertEquals("Imported genre", saved.getGenre());
        assertEquals("Bulk question 5", saved.getQuestions().get(0).getQuestion());
        assertEquals("Bulk answer 40", saved.getQuestions().get(3).getAnswer());
    }
}
