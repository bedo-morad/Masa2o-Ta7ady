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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

// SPECV3 §3.1 (admin-gated edit) + §3.2/§3.4 (bank/risk draws and tiers).
// DB-backed: needs postgres up (docker compose up -d). Rolls back after each test.
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class EditAdminGateTest {

    private static final String ADMIN = "X-Admin-Password";

    @Autowired
    MockMvc mvc;

    private final ObjectMapper mapper = new ObjectMapper();

    // ---- admin gate on PUT (all 7 pools) ----

    @Test
    void putWithoutHeaderIs401ForEveryPool() throws Exception {
        for (String pool : List.of("players", "ihbid", "offside", "top10", "scoresheet", "bank", "risk")) {
            mvc.perform(put("/api/" + pool + "/999999")
                    .contentType(MediaType.APPLICATION_JSON).content("{}"))
                    .andExpect(status().isUnauthorized());
        }
    }

    @Test
    void putWithWrongPasswordIs401() throws Exception {
        mvc.perform(put("/api/players/999999").header(ADMIN, "nope")
                .contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void deleteWithoutHeaderIs401ForBankAndRisk() throws Exception {
        mvc.perform(delete("/api/bank/999999")).andExpect(status().isUnauthorized());
        mvc.perform(delete("/api/risk/999999")).andExpect(status().isUnauthorized());
        mvc.perform(delete("/api/bank/999999").header(ADMIN, "nope")).andExpect(status().isUnauthorized());
    }

    @Test
    void putWithPasswordEditsARowInEveryPool() throws Exception {
        long playerId = createAndId("/api/players", map("playerName", "Edit player one"));
        mvc.perform(put("/api/players/" + playerId).header(ADMIN, "admin")
                .contentType(MediaType.APPLICATION_JSON).content(json(map("playerName", "Edit player one edited"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.playerName").value("Edit player one edited"));

        long ihbidId = createAndId("/api/ihbid",
                map("questionText", "Edit ihbid question?", "answerText", "5"));
        mvc.perform(put("/api/ihbid/" + ihbidId).header(ADMIN, "admin")
                .contentType(MediaType.APPLICATION_JSON).content(json(
                        map("questionText", "Edit ihbid question edited?", "answerText", "7"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.answerText").value("7"));

        long offsideId = createAndId("/api/offside", map("ruleText", "Edit offside rule"));
        mvc.perform(put("/api/offside/" + offsideId).header(ADMIN, "admin")
                .contentType(MediaType.APPLICATION_JSON).content(json(map("ruleText", "Edit offside rule edited"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.ruleText").value("Edit offside rule edited"));

        long top10Id = createAndId("/api/top10",
                map("prompt", "Edit top10 list", "answers", answers13("Edit Top")));
        mvc.perform(put("/api/top10/" + top10Id).header(ADMIN, "admin")
                .contentType(MediaType.APPLICATION_JSON).content(json(
                        map("prompt", "Edit top10 list edited", "answers", answers13("Edit Top2")))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.prompt").value("Edit top10 list edited"));

        long scoresheetId = createAndId("/api/scoresheet", scoresheetRow("Edit gate match"));
        // The legacy matchLabel spelling still binds (JsonAlias on the row DTO).
        mvc.perform(put("/api/scoresheet/" + scoresheetId).header(ADMIN, "admin")
                .contentType(MediaType.APPLICATION_JSON).content(json(scoresheetRow("Edit gate match edited"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.matchLabel").value("Edit gate match edited"));

        long bankId = createAndId("/api/bank", map("question", "Edit bank question?", "answer", "5"));
        mvc.perform(put("/api/bank/" + bankId).header(ADMIN, "admin")
                .contentType(MediaType.APPLICATION_JSON).content(json(
                        map("question", "Edit bank question edited?", "answer", "9"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.answer").value("9"));

        long riskId = createAndId("/api/risk", riskRow("Edit gate genre"));
        mvc.perform(put("/api/risk/" + riskId).header(ADMIN, "admin")
                .contentType(MediaType.APPLICATION_JSON).content(json(riskRow("Edit gate genre edited"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.genre").value("Edit gate genre edited"));
    }

    @Test
    void editingToAnotherPlayersNameIs409() throws Exception {
        long first = createAndId("/api/players", map("playerName", "Edit duplicate alpha"));
        createAndId("/api/players", map("playerName", "Edit duplicate beta"));
        mvc.perform(put("/api/players/" + first).header(ADMIN, "admin")
                .contentType(MediaType.APPLICATION_JSON).content(json(map("playerName", "Edit duplicate beta"))))
                .andExpect(status().isConflict());
    }

    // ---- bank draw: 12 default, 72 once, 1–100 clamp ----

    @Test
    void bankDrawDefaultsTo12AndClampsAt100() throws Exception {
        commitBulk("/api/bank", bankRows(110));

        mvc.perform(get("/api/bank"))
                .andExpect(status().isOk()).andExpect(jsonPath("$", hasSize(12)));
        mvc.perform(get("/api/bank").param("count", "72"))
                .andExpect(status().isOk()).andExpect(jsonPath("$", hasSize(72)));
        mvc.perform(get("/api/bank").param("count", "0"))
                .andExpect(status().isOk()).andExpect(jsonPath("$", hasSize(1)));
        mvc.perform(get("/api/bank").param("count", "500"))
                .andExpect(status().isOk()).andExpect(jsonPath("$", hasSize(100)));
    }

    // ---- risk draw: 4 default, 1–12 clamp + 4-tier enforcement on POST ----

    @Test
    void riskDrawDefaultsTo4AndClampsAt12() throws Exception {
        commitBulk("/api/risk", riskRows(15));

        mvc.perform(get("/api/risk"))
                .andExpect(status().isOk()).andExpect(jsonPath("$", hasSize(4)));
        mvc.perform(get("/api/risk").param("count", "4"))
                .andExpect(status().isOk()).andExpect(jsonPath("$[0].questions", hasSize(4)));
        mvc.perform(get("/api/risk").param("count", "0"))
                .andExpect(status().isOk()).andExpect(jsonPath("$", hasSize(1)));
        mvc.perform(get("/api/risk").param("count", "500"))
                .andExpect(status().isOk()).andExpect(jsonPath("$", hasSize(12)));
    }

    @Test
    void riskPostRejectsFewerThan4Tiers() throws Exception {
        Map<String, Object> row = riskRow("Short pack genre");
        Map<String, Object> body = new LinkedHashMap<>(row);
        body.put("questions", ((List<?>) row.get("questions")).subList(0, 3));
        mvc.perform(post("/api/risk").contentType(MediaType.APPLICATION_JSON).content(json(body)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void riskPostRejectsOutOfOrderTiers() throws Exception {
        Map<String, Object> row = riskRow("Swapped pack genre");
        List<Map<String, Object>> questions = new ArrayList<>();
        questions.add(question(10, "Swapped pack tier 10 question"));
        questions.add(question(5, "Swapped pack tier 5 question"));
        questions.add(question(20, "Swapped pack tier 20 question"));
        questions.add(question(40, "Swapped pack tier 40 question"));
        Map<String, Object> body = new LinkedHashMap<>(row);
        body.put("questions", questions);
        mvc.perform(post("/api/risk").contentType(MediaType.APPLICATION_JSON).content(json(body)))
                .andExpect(status().isBadRequest());
    }

    // ---- helpers ----

    private static Map<String, Object> map(String k1, Object v1) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put(k1, v1);
        return m;
    }

    private static Map<String, Object> map(String k1, Object v1, String k2, Object v2) {
        Map<String, Object> m = map(k1, v1);
        m.put(k2, v2);
        return m;
    }

    private static List<String> answers13(String prefix) {
        List<String> answers = new ArrayList<>();
        for (int i = 1; i <= 13; i++) {
            answers.add(prefix + " " + String.format("%02d", i));
        }
        return answers;
    }

    private static List<String> lineup11(String prefix) {
        List<String> lineup = new ArrayList<>();
        for (int i = 1; i <= 11; i++) {
            lineup.add(prefix + " " + String.format("%02d", i));
        }
        return lineup;
    }

    private static Map<String, Object> scoresheetRow(String match) {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("matchLabel", match);
        row.put("teamA", "Alpha Side");
        row.put("teamB", "Beta Side");
        row.put("lineupA", lineup11(match + " A"));
        row.put("lineupB", lineup11(match + " B"));
        return row;
    }

    private static Map<String, Object> question(int points, String text) {
        Map<String, Object> q = new LinkedHashMap<>();
        q.put("points", points);
        q.put("question", text);
        q.put("answer", "answer " + points);
        return q;
    }

    private static Map<String, Object> riskRow(String genre) {
        List<Map<String, Object>> questions = new ArrayList<>();
        questions.add(question(5, genre + " tier 5 question"));
        questions.add(question(10, genre + " tier 10 question"));
        questions.add(question(20, genre + " tier 20 question"));
        questions.add(question(40, genre + " tier 40 question"));
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("genre", genre);
        row.put("questions", questions);
        return row;
    }

    private static List<Map<String, Object>> bankRows(int count) {
        List<Map<String, Object>> rows = new ArrayList<>();
        for (int i = 0; i < count; i++) {
            rows.add(map("question", "Bank draw question " + String.format("%03d", i), "answer", "a"));
        }
        return rows;
    }

    private static List<Map<String, Object>> riskRows(int count) {
        List<Map<String, Object>> rows = new ArrayList<>();
        for (int i = 0; i < count; i++) {
            rows.add(riskRow("Draw pack genre " + String.format("%02d", i)));
        }
        return rows;
    }

    private String json(Object value) throws Exception {
        return mapper.writeValueAsString(value);
    }

    private void commitBulk(String path, List<Map<String, Object>> rows) throws Exception {
        mvc.perform(post(path + "/bulk").param("dryRun", "false")
                .contentType(MediaType.APPLICATION_JSON).content(json(rows)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].ok").value(true));
    }

    private long createAndId(String path, Map<String, Object> body) throws Exception {
        String response = mvc.perform(post(path)
                .contentType(MediaType.APPLICATION_JSON).content(json(body)))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        return mapper.readTree(response).get("id").asLong();
    }
}
