package com.ta7ady.backend.web;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
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
class ScoresheetSingleAddWebTest extends com.ta7ady.backend.PostgreSqlIntegrationTest {
    @Autowired
    MockMvc mvc;

    private final ObjectMapper mapper = new ObjectMapper();

    @Test
    void acceptsCanonicalFieldsAndEachLegacyMatchAlias() throws Exception {
        postJson(scoresheetWith("match", "Big Final"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.matchLabel").value("Big Final"))
                .andExpect(jsonPath("$.lineupA", hasSize(11)));
        postJson(scoresheetWith("matchLabel", "Legacy Final"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.matchLabel").value("Legacy Final"));
        postJson(scoresheetWith("match_label", "Snake Final"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.matchLabel").value("Snake Final"));
    }

    @Test
    void canonicalMatchWinsOverCompetingAliases() throws Exception {
        ObjectNode body = scoresheetWith("match", "Canonical Final");
        body.put("matchLabel", "Camel Final");
        body.put("match_label", "Snake Final");
        postJson(body).andExpect(status().isOk())
                .andExpect(jsonPath("$.matchLabel").value("Canonical Final"));
    }

    @Test
    void nullCanonicalFallsBackToAliasesButNullAliasesContinueInOrder() throws Exception {
        ObjectNode camelFallback = scoresheetWith("match", (String) null);
        camelFallback.put("matchLabel", "Camel Final");
        camelFallback.put("match_label", "Snake Final");
        postJson(camelFallback).andExpect(status().isOk())
                .andExpect(jsonPath("$.matchLabel").value("Camel Final"));

        ObjectNode snakeFallback = scoresheetWith("match", (String) null);
        snakeFallback.putNull("matchLabel");
        snakeFallback.put("match_label", "Snake Final");
        postJson(snakeFallback).andExpect(status().isOk())
                .andExpect(jsonPath("$.matchLabel").value("Snake Final"));

        ObjectNode noMatch = scoresheetWith("match", (String) null);
        noMatch.putNull("matchLabel");
        noMatch.putNull("match_label");
        postJson(noMatch).andExpect(status().isBadRequest());
    }

    @Test
    void canonicalEmptyOrWrongTypeDoesNotFallBackToAliases() throws Exception {
        ObjectNode empty = scoresheetWith("match", "");
        empty.put("matchLabel", "Alias Final");
        postJson(empty).andExpect(status().isBadRequest());

        ObjectNode wrongType = scoresheetWith("match", mapper.createObjectNode());
        wrongType.put("matchLabel", "Alias Final");
        postJson(wrongType).andExpect(status().isBadRequest());

        ObjectNode numeric = scoresheetWith("match", mapper.getNodeFactory().numberNode(123));
        numeric.put("matchLabel", "Alias Final");
        postJson(numeric).andExpect(status().isOk())
                .andExpect(jsonPath("$.matchLabel").value("123"));
    }

    @Test
    void coercesScalarStringsAndNumbersWhileWrongLineupShapesFailValidation() throws Exception {
        ObjectNode body = scoresheetWith("match", "123");
        body.put("teamA", 123);
        body.put("teamB", 456);
        body.set("lineupA", numericLineup());
        body.set("lineupB", numericLineup());
        postJson(body).andExpect(status().isOk())
                .andExpect(jsonPath("$.teamA").value("123"))
                .andExpect(jsonPath("$.lineupA[0]").value("101"));

        ObjectNode wrongA = scoresheetWith("match", "Big Final");
        wrongA.put("lineupA", "not a list");
        postJson(wrongA).andExpect(status().isBadRequest());
        ObjectNode wrongB = scoresheetWith("match", "Big Final");
        wrongB.put("lineupB", "not a list");
        postJson(wrongB).andExpect(status().isBadRequest());
    }

    @Test
    void missingFieldsAndUnknownAliasesAreBadRequest() throws Exception {
        ObjectNode missingMatch = scoresheetWith("match", "Big Final");
        missingMatch.remove("match");
        postJson(missingMatch).andExpect(status().isBadRequest());

        ObjectNode unknown = scoresheetWith("match", "Big Final");
        unknown.remove("match");
        unknown.put("fixture", "Big Final");
        postJson(unknown).andExpect(status().isBadRequest());

        ObjectNode missingTeamA = scoresheetWith("match", "Big Final");
        missingTeamA.remove("teamA");
        postJson(missingTeamA).andExpect(status().isBadRequest());
        ObjectNode missingLineup = scoresheetWith("match", "Big Final");
        missingLineup.remove("lineupB");
        postJson(missingLineup).andExpect(status().isBadRequest());
    }

    @Test
    void malformedAndNonObjectBodiesAreBadRequest() throws Exception {
        postRaw("{").andExpect(status().isBadRequest());
        postJson(mapper.createArrayNode().add(scoresheetWith("match", "Big Final")))
                .andExpect(status().isBadRequest());
        postRaw("null").andExpect(status().isBadRequest());
    }

    @Test
    void structuredCanonicalValuesAreCoercedAndStillTakePrecedenceOverAliases() throws Exception {
        ObjectNode body = scoresheetWith("match", mapper.createObjectNode().put("stage", "final"));
        body.put("matchLabel", "Alias must not win");
        body.set("teamA", mapper.createArrayNode().add("Alpha").add("Bravo"));
        body.put("teamB", true);
        ArrayNode names = lineup("Side A");
        names.set(0, mapper.createObjectNode().put("player", 7));
        names.set(1, mapper.createArrayNode().add("Charlie").add("Delta"));
        body.set("lineupA", names);
        postJson(body).andExpect(status().isOk())
                .andExpect(jsonPath("$.matchLabel").value("{stage=final}"))
                .andExpect(jsonPath("$.teamA").value("[Alpha, Bravo]"))
                .andExpect(jsonPath("$.teamB").value("true"))
                .andExpect(jsonPath("$.lineupA[0]").value("{player=7}"))
                .andExpect(jsonPath("$.lineupA[1]").value("[Charlie, Delta]"));
    }

    @Test
    void nullAndWrongFieldsRetainValidationReasonOrder() throws Exception {
        ObjectNode body = scoresheetWith("match", (String) null);
        body.putNull("teamA");
        body.set("lineupB", mapper.createObjectNode().put("player", 7));
        postJson(body).andExpect(status().isBadRequest())
                .andExpect(result -> org.junit.jupiter.api.Assertions.assertEquals(
                        "match must be at least 3 characters; teamA must be at least 3 characters; "
                                + "lineupB must contain exactly 11 entries",
                        ((org.springframework.web.server.ResponseStatusException)
                                result.getResolvedException()).getReason()));
    }

    private org.springframework.test.web.servlet.ResultActions postJson(JsonNode body) throws Exception {
        return postRaw(mapper.writeValueAsString(body));
    }

    private org.springframework.test.web.servlet.ResultActions postRaw(String body) throws Exception {
        return mvc.perform(post("/api/scoresheet").contentType(MediaType.APPLICATION_JSON).content(body));
    }

    private static ObjectNode scoresheetWith(String matchKey, String match) {
        ObjectMapper mapper = new ObjectMapper();
        ObjectNode body = mapper.createObjectNode();
        if (match == null) body.putNull(matchKey); else body.put(matchKey, match);
        body.put("teamA", "Team Alpha");
        body.put("teamB", "Team Beta");
        body.set("lineupA", lineup("Side A"));
        body.set("lineupB", lineup("Side B"));
        return body;
    }

    private static ObjectNode scoresheetWith(String matchKey, JsonNode match) {
        ObjectNode body = scoresheetWith(matchKey, "Big Final");
        body.set(matchKey, match);
        return body;
    }

    private static ArrayNode lineup(String prefix) {
        ArrayNode names = new ObjectMapper().createArrayNode();
        for (int i = 1; i <= 11; i++) names.add(prefix + " " + String.format("%02d", i));
        return names;
    }

    private static ArrayNode numericLineup() {
        ArrayNode names = new ObjectMapper().createArrayNode();
        for (int i = 1; i <= 11; i++) names.add(100 + i);
        return names;
    }
}
