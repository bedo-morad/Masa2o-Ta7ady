package com.ta7ady.backend.web;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class ScoresheetSingleAddWebTest {
    @Autowired
    MockMvc mvc;

    private final ObjectMapper mapper = new ObjectMapper();

    @Test
    void acceptsCanonicalFieldsAndLegacyMatchAliases() throws Exception {
        postJson(row("match", "Big Final"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.matchLabel").value("Big Final"))
                .andExpect(jsonPath("$.lineupA", hasSize(11)));
        postJson(row("matchLabel", "Legacy Final")).andExpect(status().isOk())
                .andExpect(jsonPath("$.matchLabel").value("Legacy Final"));
        postJson(row("match_label", "Snake Final")).andExpect(status().isOk())
                .andExpect(jsonPath("$.matchLabel").value("Snake Final"));
    }

    @Test
    void canonicalMatchWinsOverAliasesAndNullCanonicalFallsBack() throws Exception {
        Map<String, Object> canonicalWins = row("match", "Canonical Final");
        canonicalWins.put("matchLabel", "Camel Final");
        canonicalWins.put("match_label", "Snake Final");
        postJson(canonicalWins).andExpect(status().isOk())
                .andExpect(jsonPath("$.matchLabel").value("Canonical Final"));

        Map<String, Object> nullFallsBack = row("match", null);
        nullFallsBack.put("matchLabel", "Camel Final");
        nullFallsBack.put("match_label", "Snake Final");
        postJson(nullFallsBack).andExpect(status().isOk())
                .andExpect(jsonPath("$.matchLabel").value("Camel Final"));

        Map<String, Object> nullBothFallsBack = row("match", null);
        nullBothFallsBack.put("matchLabel", null);
        nullBothFallsBack.put("match_label", "Snake Final");
        postJson(nullBothFallsBack).andExpect(status().isOk())
                .andExpect(jsonPath("$.matchLabel").value("Snake Final"));
    }

    @Test
    void coercesScalarStringsAndNumbersButWrongLineupShapesFailValidation() throws Exception {
        Map<String, Object> body = row("match", "123");
        body.put("teamA", 123);
        body.put("teamB", 456);
        body.put("lineupA", numericLineup());
        body.put("lineupB", numericLineup());
        postJson(body).andExpect(status().isOk())
                .andExpect(jsonPath("$.teamA").value("123"))
                .andExpect(jsonPath("$.lineupA[0]").value("101"));

        Map<String, Object> wrongLineup = row("match", "Big Final");
        wrongLineup.put("lineupA", "not a list");
        postJson(wrongLineup).andExpect(status().isBadRequest());
    }

    @Test
    void missingFieldsAndUnknownAliasesAreBadRequest() throws Exception {
        Map<String, Object> missingMatch = row("match", null);
        missingMatch.remove("match");
        postJson(missingMatch).andExpect(status().isBadRequest());

        Map<String, Object> unknown = row("match", null);
        unknown.remove("match");
        unknown.put("fixture", "Big Final");
        postJson(unknown).andExpect(status().isBadRequest());

        Map<String, Object> missingTeam = row("match", "Big Final");
        missingTeam.remove("teamA");
        postJson(missingTeam).andExpect(status().isBadRequest());
    }

    @Test
    void malformedAndNonObjectBodiesAreBadRequest() throws Exception {
        mvc.perform(post("/api/scoresheet").contentType(MediaType.APPLICATION_JSON).content("{"))
                .andExpect(status().isBadRequest());
        mvc.perform(post("/api/scoresheet").contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(List.of(row("match", "Big Final")))))
                .andExpect(status().isBadRequest());
        mvc.perform(post("/api/scoresheet").contentType(MediaType.APPLICATION_JSON).content("null"))
                .andExpect(status().isBadRequest());
    }

    private org.springframework.test.web.servlet.ResultActions postJson(Object body) throws Exception {
        return mvc.perform(post("/api/scoresheet").contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(body)));
    }

    private static Map<String, Object> row(String matchKey, Object match) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put(matchKey, match);
        body.put("teamA", "Team Alpha");
        body.put("teamB", "Team Beta");
        body.put("lineupA", lineup("Side A"));
        body.put("lineupB", lineup("Side B"));
        return body;
    }

    private static List<String> lineup(String prefix) {
        List<String> names = new ArrayList<>();
        for (int i = 1; i <= 11; i++) names.add(prefix + " " + String.format("%02d", i));
        return names;
    }

    private static List<Integer> numericLineup() {
        List<Integer> names = new ArrayList<>();
        for (int i = 1; i <= 11; i++) names.add(100 + i);
        return names;
    }
}
