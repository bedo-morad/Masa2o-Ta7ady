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

// SPECV4 §4.1 (ana meen pool) + SPECV3 §3.1 (admin-gated edit) patterns.
// DB-backed: needs postgres up (docker compose up -d). Rolls back after each test.
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class AnameenAdminGateTest {

    private static final String ADMIN = "X-Admin-Password";

    @Autowired
    MockMvc mvc;

    private final ObjectMapper mapper = new ObjectMapper();

    // ---- admin gate on PUT/DELETE ----

    @Test
    void putAndDeleteWithoutHeaderAre401() throws Exception {
        mvc.perform(put("/api/anameen/999999")
                .contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isUnauthorized());
        mvc.perform(delete("/api/anameen/999999")).andExpect(status().isUnauthorized());
        mvc.perform(delete("/api/anameen/999999").header(ADMIN, "nope"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void putWithPasswordEditsARow() throws Exception {
        long id = createAndId("/api/anameen", subjectRow("Gate subject player one"));
        mvc.perform(put("/api/anameen/" + id).header(ADMIN, "admin")
                .contentType(MediaType.APPLICATION_JSON).content(json(subjectRow("Gate subject player renamed"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.player").value("Gate subject player renamed"))
                .andExpect(jsonPath("$.clues[0]").value("Gate subject player renamed club 01"))
                .andExpect(jsonPath("$.clues[4]").value("Gate subject player renamed club 05"));
    }

    @Test
    void editingToAnotherPlayersNameIs409() throws Exception {
        long first = createAndId("/api/anameen", subjectRow("Gate duplicate alpha"));
        createAndId("/api/anameen", subjectRow("Gate duplicate beta"));
        mvc.perform(put("/api/anameen/" + first).header(ADMIN, "admin")
                .contentType(MediaType.APPLICATION_JSON).content(json(subjectRow("Gate duplicate beta"))))
                .andExpect(status().isConflict());
    }

    @Test
    void deleteWithPasswordSucceeds() throws Exception {
        long id = createAndId("/api/anameen", subjectRow("Delete me subject player"));
        mvc.perform(delete("/api/anameen/" + id).header(ADMIN, "admin"))
                .andExpect(status().isOk());
    }

    // ---- draw: 3 default, 1–10 clamp ----

    @Test
    void drawDefaultsTo3AndClampsAt10() throws Exception {
        commitBulk("/api/anameen", subjectRows(12));

        mvc.perform(get("/api/anameen"))
                .andExpect(status().isOk()).andExpect(jsonPath("$", hasSize(3)));
        mvc.perform(get("/api/anameen").param("count", "5"))
                .andExpect(status().isOk()).andExpect(jsonPath("$", hasSize(5)));
        mvc.perform(get("/api/anameen").param("count", "0"))
                .andExpect(status().isOk()).andExpect(jsonPath("$", hasSize(1)));
        mvc.perform(get("/api/anameen").param("count", "500"))
                .andExpect(status().isOk()).andExpect(jsonPath("$", hasSize(10)));
    }

    // ---- POST validation ----

    @Test
    void postRejectsWrongClueCount() throws Exception {
        Map<String, Object> row = subjectRow("Short pack player");
        Map<String, Object> body = new LinkedHashMap<>(row);
        body.put("clues", ((List<?>) row.get("clues")).subList(0, 4));
        mvc.perform(post("/api/anameen").contentType(MediaType.APPLICATION_JSON).content(json(body)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void postRejectsDuplicateClues() throws Exception {
        List<String> clues = new ArrayList<>(clues5("Dup"));
        clues.set(4, clues.get(0).toUpperCase());
        Map<String, Object> body = new LinkedHashMap<>(subjectRow("Dup clue player"));
        body.put("clues", clues);
        mvc.perform(post("/api/anameen").contentType(MediaType.APPLICATION_JSON).content(json(body)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void postRejectsExistingPlayer() throws Exception {
        createAndId("/api/anameen", subjectRow("Already there player"));
        mvc.perform(post("/api/anameen").contentType(MediaType.APPLICATION_JSON)
                .content(json(subjectRow("Already there player"))))
                .andExpect(status().isConflict());
    }

    // ---- bulk: dry-run vs commit, in-batch + DB dedupe ----

    @Test
    void bulkDryRunSavesNothingCommitSavesValidOnly() throws Exception {
        List<Map<String, Object>> rows = List.of(
                subjectRow("Bulk dry subject player"),
                subjectRow("ab"),
                subjectRow("bulk dry subject player"));
        String body = json(rows);

        mvc.perform(post("/api/anameen/bulk").param("dryRun", "true")
                .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(3)))
                .andExpect(jsonPath("$[0].ok").value(true))
                .andExpect(jsonPath("$[1].ok").value(false))
                .andExpect(jsonPath("$[2].ok").value(false));

        mvc.perform(get("/api/anameen/all").param("size", "1000"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[?(@.player == 'Bulk dry subject player')]").doesNotExist());

        mvc.perform(post("/api/anameen/bulk").param("dryRun", "false")
                .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].ok").value(true))
                .andExpect(jsonPath("$[0].id").exists())
                .andExpect(jsonPath("$[1].ok").value(false))
                .andExpect(jsonPath("$[2].ok").value(false));

        mvc.perform(get("/api/anameen/all").param("size", "1000"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[?(@.player == 'Bulk dry subject player')]", hasSize(1)));
    }

    // ---- helpers ----

    static List<String> clues5(String prefix) {
        List<String> clues = new ArrayList<>();
        for (int i = 1; i <= 5; i++) {
            clues.add(prefix + " club " + String.format("%02d", i));
        }
        return clues;
    }

    private static Map<String, Object> subjectRow(String player) {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("player", player);
        row.put("clues", clues5(player));
        return row;
    }

    private static List<Map<String, Object>> subjectRows(int count) {
        List<Map<String, Object>> rows = new ArrayList<>();
        for (int i = 0; i < count; i++) {
            rows.add(subjectRow("Clamp subject player " + String.format("%02d", i)));
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
