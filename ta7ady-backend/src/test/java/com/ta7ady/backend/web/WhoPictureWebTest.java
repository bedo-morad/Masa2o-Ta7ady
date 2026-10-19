package com.ta7ady.backend.web;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ta7ady.backend.repository.WhoPicturePhotoRepository;
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

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

// SPECV4 §4.3: 11-name + URL enforcement, draw default 1 clamp 1–5, bulk, admin gates.
// DB-backed: uses the isolated PostgreSQL test fixture. Rolls back after each test.
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class WhoPictureWebTest extends com.ta7ady.backend.PostgreSqlIntegrationTest {

    private static final String ADMIN = "X-Admin-Password";
    private static final String URL = "https://example.com/team-photo.jpg";
    private static final String TITLE = "الأهلي 2021 نهائي دوري أبطال أفريقيا";

    @Autowired
    MockMvc mvc;

    @Autowired
    WhoPicturePhotoRepository repository;

    private final ObjectMapper mapper = new ObjectMapper();

    static List<String> players11(String prefix) {
        List<String> names = new ArrayList<>();
        for (int i = 1; i <= 11; i++) {
            names.add(prefix + " " + String.format("%02d", i));
        }
        return names;
    }

    static Map<String, Object> row(String url, String prefix) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("title", TITLE);
        m.put("photoUrl", url);
        m.put("players", players11(prefix));
        return m;
    }

    private static List<Map<String, Object>> rows(int count) {
        List<Map<String, Object>> list = new ArrayList<>();
        for (int i = 0; i < count; i++) {
            list.add(row("https://example.com/photo-" + String.format("%03d", i) + ".jpg",
                    "Draw Player " + String.format("%02d", i)));
        }
        return list;
    }

    // ---- POST validation ----

    @Test
    void postAcceptsAValidPhoto() throws Exception {
        mvc.perform(post("/api/whopicture").contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(row(URL, "Valid Player"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value(TITLE))
                .andExpect(jsonPath("$.photoUrl").value(URL))
                .andExpect(jsonPath("$.players", hasSize(11)))
                .andExpect(jsonPath("$.players[10]").value("Valid Player 11"));
    }

    @Test
    void postRejectsMissingShortOrBlankTitle() throws Exception {
        Map<String, Object> noTitle = row(URL, "No Title");
        noTitle.remove("title");
        mvc.perform(post("/api/whopicture").contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(noTitle)))
                .andExpect(status().isBadRequest());

        Map<String, Object> shortTitle = row(URL, "Short Title");
        shortTitle.put("title", "ab");
        mvc.perform(post("/api/whopicture").contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(shortTitle)))
                .andExpect(status().isBadRequest());

        Map<String, Object> blankTitle = row(URL, "Blank Title");
        blankTitle.put("title", "   ");
        mvc.perform(post("/api/whopicture").contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(blankTitle)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void postRejectsFewerThan11Names() throws Exception {
        Map<String, Object> body = row(URL, "Ten Only");
        body.put("players", players11("Ten Only").subList(0, 10));
        mvc.perform(post("/api/whopicture").contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(body)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void postRejectsDuplicateNames() throws Exception {
        Map<String, Object> body = row(URL, "Dup Player");
        List<String> names = players11("Dup Player");
        names.set(0, names.get(1));
        body.put("players", names);
        mvc.perform(post("/api/whopicture").contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(body)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void postRejectsEmptyOrBadUrl() throws Exception {
        mvc.perform(post("/api/whopicture").contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(row("  ", "Bad Url P"))))
                .andExpect(status().isBadRequest());
        mvc.perform(post("/api/whopicture").contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(row("not-a-url", "Bad Url P"))))
                .andExpect(status().isBadRequest());
    }

    // ---- draw defaults / clamps ----

    @Test
    void drawDefaultsToOneAndClampsAt5() throws Exception {
        commitBulk(rows(8));

        mvc.perform(get("/api/whopicture"))
                .andExpect(status().isOk()).andExpect(jsonPath("$", hasSize(1)));
        mvc.perform(get("/api/whopicture").param("count", "3"))
                .andExpect(status().isOk()).andExpect(jsonPath("$", hasSize(3)));
        mvc.perform(get("/api/whopicture").param("count", "0"))
                .andExpect(status().isOk()).andExpect(jsonPath("$", hasSize(1)));
        mvc.perform(get("/api/whopicture").param("count", "500"))
                .andExpect(status().isOk()).andExpect(jsonPath("$", hasSize(5)));
    }

    @Test
    void allIsPaged() throws Exception {
        long before = repository.count();
        commitBulk(rows(4));
        mvc.perform(get("/api/whopicture/all").param("size", "2").param("page", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(2)))
                .andExpect(jsonPath("$.totalElements").value(before + 4));
    }

    // ---- bulk ----

    @Test
    void bulkDryRunPreviewsAndCommitSavesValidOnly() throws Exception {
        Map<String, Object> good = row("https://example.com/one.jpg", "Bulk Player One");
        Map<String, Object> shortRow = row(URL, "Bulk Ten Names");
        shortRow.put("players", players11("Bulk Ten Names").subList(0, 10));
        List<Map<String, Object>> list = List.of(
                good,
                shortRow,
                row("https://example.com/one.jpg", "Bulk Player One")); // same URL + same names
        String body = mapper.writeValueAsString(list);

        mvc.perform(post("/api/whopicture/bulk").param("dryRun", "true")
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(3)))
                .andExpect(jsonPath("$[0].ok").value(true))
                .andExpect(jsonPath("$[1].ok").value(false))
                .andExpect(jsonPath("$[1].errors[0]").value(containsString("exactly 11")))
                .andExpect(jsonPath("$[2].ok").value(false))
                .andExpect(jsonPath("$[2].errors[0]").value(containsString("duplicate of row 0")));

        mvc.perform(post("/api/whopicture/bulk").param("dryRun", "false")
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].ok").value(true))
                .andExpect(jsonPath("$[0].id").exists())
                .andExpect(jsonPath("$[1].ok").value(false))
                .andExpect(jsonPath("$[2].ok").value(false));
    }

    // ---- admin gates ----

    @Test
    void putAndDeleteAre401WithoutHeader() throws Exception {
        mvc.perform(put("/api/whopicture/999999").contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(row(URL, "Gate Player"))))
                .andExpect(status().isUnauthorized());
        mvc.perform(delete("/api/whopicture/999999")).andExpect(status().isUnauthorized());
        mvc.perform(delete("/api/whopicture/999999").header(ADMIN, "nope"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void putWithAdminEditsAndDeleteRemoves() throws Exception {
        long id = createAndId(row(URL, "Edit Player"));
        Map<String, Object> edited = row("https://example.com/edited.jpg", "Edited Player");
        edited.put("title", "ريال مدريد 2022 نصف نهائي دوري أبطال أوروبا");
        mvc.perform(put("/api/whopicture/" + id).header(ADMIN, "admin")
                        .contentType(MediaType.APPLICATION_JSON).content(mapper.writeValueAsString(edited)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("ريال مدريد 2022 نصف نهائي دوري أبطال أوروبا"))
                .andExpect(jsonPath("$.photoUrl").value("https://example.com/edited.jpg"))
                .andExpect(jsonPath("$.players[0]").value("Edited Player 01"));

        mvc.perform(delete("/api/whopicture/" + id).header(ADMIN, "admin"))
                .andExpect(status().isOk());
        mvc.perform(get("/api/whopicture/all"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[?(@.id == " + id + ")]").doesNotExist());
    }

    @Test
    void putRejectsInvalidBody() throws Exception {
        long id = createAndId(row(URL, "Gate Keep"));
        Map<String, Object> bad = row(URL, "Gate Keep");
        bad.put("players", players11("Gate Keep").subList(0, 9));
        mvc.perform(put("/api/whopicture/" + id).header(ADMIN, "admin")
                        .contentType(MediaType.APPLICATION_JSON).content(mapper.writeValueAsString(bad)))
                .andExpect(status().isBadRequest());
    }

    // ---- helpers ----

    private void commitBulk(List<Map<String, Object>> list) throws Exception {
        mvc.perform(post("/api/whopicture/bulk").param("dryRun", "false")
                        .contentType(MediaType.APPLICATION_JSON).content(mapper.writeValueAsString(list)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].ok").value(true));
    }

    private long createAndId(Map<String, Object> body) throws Exception {
        String response = mvc.perform(post("/api/whopicture")
                        .contentType(MediaType.APPLICATION_JSON).content(mapper.writeValueAsString(body)))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        return mapper.readTree(response).get("id").asLong();
    }
}
