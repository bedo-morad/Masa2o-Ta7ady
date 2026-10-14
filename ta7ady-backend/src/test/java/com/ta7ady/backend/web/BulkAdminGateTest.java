package com.ta7ady.backend.web;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

// DB-backed: needs postgres up (docker compose up -d). Rolls back after each test.
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class BulkAdminGateTest {

    @Autowired
    MockMvc mvc;

    private final ObjectMapper mapper = new ObjectMapper();

    static List<String> answers13(String prefix) {
        List<String> answers = new ArrayList<>();
        for (int i = 1; i <= 13; i++) {
            answers.add(prefix + " " + String.format("%02d", i));
        }
        return answers;
    }

    static List<String> lineup11(String prefix) {
        List<String> lineup = new ArrayList<>();
        for (int i = 1; i <= 11; i++) {
            lineup.add(prefix + " " + String.format("%02d", i));
        }
        return lineup;
    }

    static Map<String, Object> top10Row(String prompt, List<String> answers) {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("prompt", prompt);
        row.put("answers", answers);
        return row;
    }

    static Map<String, Object> scoresheetRow(String match, String teamA, String teamB) {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("match", match);
        row.put("teamA", teamA);
        row.put("teamB", teamB);
        row.put("lineupA", lineup11(match + " A"));
        row.put("lineupB", lineup11(match + " B"));
        return row;
    }

    // ---- admin gate ----

    @Test
    void deleteWithoutHeaderIs401() throws Exception {
        String id = createTop10("Admin gate list", "Gate");
        mvc.perform(delete("/api/top10/" + id)).andExpect(status().isUnauthorized());
        mvc.perform(delete("/api/scoresheet/999999")).andExpect(status().isUnauthorized());
        mvc.perform(delete("/api/players/999999")).andExpect(status().isUnauthorized());
        mvc.perform(delete("/api/ihbid/999999")).andExpect(status().isUnauthorized());
        mvc.perform(delete("/api/offside/999999")).andExpect(status().isUnauthorized());
    }

    @Test
    void deleteWithWrongPasswordIs401() throws Exception {
        String id = createTop10("Wrong password list", "Wrong");
        mvc.perform(delete("/api/top10/" + id).header("X-Admin-Password", "nope"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void deleteWithPasswordSucceeds() throws Exception {
        String id = createTop10("Delete me list", "Gone");
        mvc.perform(delete("/api/top10/" + id).header("X-Admin-Password", "admin"))
                .andExpect(status().isOk());
        mvc.perform(get("/api/top10/all")).andExpect(status().isOk());
    }

    // ---- count defaults / clamps ----

    @Test
    void top10DefaultIsOneAndZeroClampsToOne() throws Exception {
        createTop10("Clamp list one", "Cone");
        createTop10("Clamp list two", "Ctwo");
        mvc.perform(get("/api/top10")).andExpect(status().isOk()).andExpect(jsonPath("$", hasSize(1)));
        mvc.perform(get("/api/top10").param("count", "0"))
                .andExpect(status().isOk()).andExpect(jsonPath("$", hasSize(1)));
    }

    @Test
    void top10UpperClampIs50() throws Exception {
        List<Map<String, Object>> rows = new ArrayList<>();
        for (int i = 0; i < 60; i++) {
            rows.add(top10Row("Clamp bulk list " + String.format("%03d", i), answers13("Bulk " + i)));
        }
        mvc.perform(post("/api/top10/bulk").param("dryRun", "false")
                .contentType(MediaType.APPLICATION_JSON).content(mapper.writeValueAsString(rows)))
                .andExpect(status().isOk());
        mvc.perform(get("/api/top10").param("count", "500"))
                .andExpect(status().isOk()).andExpect(jsonPath("$", hasSize(50)));
    }

    @Test
    void scoresheetClampIs1To10() throws Exception {
        List<Map<String, Object>> rows = new ArrayList<>();
        for (int i = 0; i < 12; i++) {
            rows.add(scoresheetRow("Clamp match " + String.format("%03d", i), "Alpha Side", "Beta Side"));
        }
        mvc.perform(post("/api/scoresheet/bulk").param("dryRun", "false")
                .contentType(MediaType.APPLICATION_JSON).content(mapper.writeValueAsString(rows)))
                .andExpect(status().isOk());
        mvc.perform(get("/api/scoresheet")).andExpect(status().isOk()).andExpect(jsonPath("$", hasSize(1)));
        mvc.perform(get("/api/scoresheet").param("count", "0"))
                .andExpect(status().isOk()).andExpect(jsonPath("$", hasSize(1)));
        mvc.perform(get("/api/scoresheet").param("count", "500"))
                .andExpect(status().isOk()).andExpect(jsonPath("$", hasSize(10)));
    }

    // ---- bulk dry-run vs commit ----

    @Test
    void playersBulkDryRunSavesNothingCommitSavesValidOnly() throws Exception {
        List<Map<String, Object>> rows = List.of(
                Map.of("playerName", "Bulk Dry Player One"),
                Map.of("playerName", "x"),
                Map.of("playerName", "bulk dry player one"));
        String body = mapper.writeValueAsString(rows);

        mvc.perform(post("/api/players/bulk").param("dryRun", "true")
                .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(3)))
                .andExpect(jsonPath("$[0].ok").value(true))
                .andExpect(jsonPath("$[1].ok").value(false))
                .andExpect(jsonPath("$[2].ok").value(false))
                .andExpect(jsonPath("$[2].errors[0]").exists());

        // Nothing saved by the dry run.
        mvc.perform(get("/api/players/all").param("size", "1000"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[?(@.playerName == 'Bulk Dry Player One')]").doesNotExist());

        mvc.perform(post("/api/players/bulk").param("dryRun", "false")
                .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].ok").value(true))
                .andExpect(jsonPath("$[0].id").exists())
                .andExpect(jsonPath("$[1].ok").value(false))
                .andExpect(jsonPath("$[2].ok").value(false));

        // Exactly the one valid row landed in the DB.
        mvc.perform(get("/api/players/all").param("size", "1000"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[?(@.playerName == 'Bulk Dry Player One')]", hasSize(1)));
    }

    @Test
    void top10BulkEnforces13AndInBatchDedupe() throws Exception {
        List<Map<String, Object>> rows = List.of(
                top10Row("Dry valid list", answers13("Dry")),
                top10Row("Dry short list", answers13("Dry").subList(0, 12)),
                top10Row("dry valid list", answers13("Other")));
        String body = mapper.writeValueAsString(rows);

        mvc.perform(post("/api/top10/bulk").param("dryRun", "true")
                .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].ok").value(true))
                .andExpect(jsonPath("$[1].ok").value(false))
                .andExpect(jsonPath("$[1].errors[0]").value(org.hamcrest.Matchers.containsString("13")))
                .andExpect(jsonPath("$[2].ok").value(false));

        mvc.perform(post("/api/top10/bulk").param("dryRun", "false")
                .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].ok").value(true))
                .andExpect(jsonPath("$[0].id").exists())
                .andExpect(jsonPath("$[1].ok").value(false))
                .andExpect(jsonPath("$[2].ok").value(false));
    }

    @Test
    void scoresheetBulkEnforces11Plus11() throws Exception {
        Map<String, Object> bad = scoresheetRow("Dry bad match", "Alpha Side", "Beta Side");
        bad.put("lineupA", lineup11("Bad").subList(0, 10));
        List<Map<String, Object>> rows = List.of(
                scoresheetRow("Dry good match", "Alpha Side", "Beta Side"),
                bad,
                scoresheetRow("dry good match", "Alpha Side", "Beta Side"));
        String body = mapper.writeValueAsString(rows);

        mvc.perform(post("/api/scoresheet/bulk").param("dryRun", "false")
                .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].ok").value(true))
                .andExpect(jsonPath("$[0].id").exists())
                .andExpect(jsonPath("$[1].ok").value(false))
                .andExpect(jsonPath("$[2].ok").value(false));
    }

    @Test
    void ihbidAndOffsideBulkCommitValidOnly() throws Exception {
        String ihbid = mapper.writeValueAsString(List.of(
                Map.of("questionText", "Dry ihbid question one?", "answerText", "5"),
                Map.of("questionText", "x", "answerText", "5"),
                Map.of("questionText", "Dry ihbid question one?", "answerText", "6")));
        mvc.perform(post("/api/ihbid/bulk").param("dryRun", "false")
                .contentType(MediaType.APPLICATION_JSON).content(ihbid))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].ok").value(true))
                .andExpect(jsonPath("$[0].id").exists())
                .andExpect(jsonPath("$[1].ok").value(false))
                .andExpect(jsonPath("$[2].ok").value(false));

        String offside = mapper.writeValueAsString(List.of(
                Map.of("ruleText", "Dry offside rule one"),
                Map.of("ruleText", "ab"),
                Map.of("ruleText", "Dry offside rule one")));
        mvc.perform(post("/api/offside/bulk").param("dryRun", "false")
                .contentType(MediaType.APPLICATION_JSON).content(offside))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].ok").value(true))
                .andExpect(jsonPath("$[0].id").exists())
                .andExpect(jsonPath("$[1].ok").value(false))
                .andExpect(jsonPath("$[2].ok").value(false));
    }

    @Test
    void oversizedBulkIsRejectedGracefully() throws Exception {
        List<Map<String, Object>> rows = new ArrayList<>();
        for (int i = 0; i < 1001; i++) {
            rows.add(Map.of("playerName", "Oversized Player " + i));
        }
        mvc.perform(post("/api/players/bulk").param("dryRun", "true")
                .contentType(MediaType.APPLICATION_JSON).content(mapper.writeValueAsString(rows)))
                .andExpect(status().isPayloadTooLarge());
    }

    // ---- helpers ----

    private String createTop10(String prompt, String prefix) throws Exception {
        String body = mapper.writeValueAsString(top10Row(prompt, answers13(prefix)));
        String response = mvc.perform(post("/api/top10")
                .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        return String.valueOf(mapper.readTree(response).get("id").asLong());
    }
}
