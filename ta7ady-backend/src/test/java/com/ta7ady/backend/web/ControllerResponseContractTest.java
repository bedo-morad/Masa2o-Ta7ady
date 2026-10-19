package com.ta7ady.backend.web;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.util.List;
import java.util.Map;
import java.util.stream.IntStream;
import java.util.stream.Stream;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties = "admin.password=controller-contract-admin")
@AutoConfigureMockMvc
@Transactional
class ControllerResponseContractTest {
    private static final String ADMIN_PASSWORD = "controller-contract-admin";
    @Autowired
    MockMvc mvc;
    private final ObjectMapper mapper = new ObjectMapper();

    static Stream<Arguments> pools() {
        return Stream.of(
                Arguments.of("players", Map.of("playerName", "Response contract player")),
                Arguments.of("password", Map.of("playerName", "Response contract password")),
                Arguments.of("acting", Map.of("playerName", "Response contract acting")),
                Arguments.of("ihbid", Map.of("questionText", "Response contract question", "answerText", "1")),
                Arguments.of("offside", Map.of("ruleText", "Response contract rule")),
                Arguments.of("bank", Map.of("question", "Response contract bank", "answer", "1")),
                Arguments.of("top10", Map.of("prompt", "Response contract top ten", "answers", names(13))),
                Arguments.of("scoresheet", Map.of("match", "Response contract match", "teamA", "Alpha team",
                        "teamB", "Bravo team", "lineupA", names(11), "lineupB", names(11))),
                Arguments.of("risk", Map.of("genre", "Response contract genre", "questions",
                        List.of(5, 10, 20, 40).stream().map(points -> Map.of("points", points,
                                "question", "Response question " + points, "answer", "Response answer")).toList())),
                Arguments.of("anameen", Map.of("player", "Response contract subject", "clues", names(5))),
                Arguments.of("whopicture", Map.of("title", "Response contract photo",
                        "photoUrl", "https://example.com/response-contract.jpg", "players", names(11))));
    }

    private static List<String> names(int count) {
        return IntStream.rangeClosed(1, count).mapToObj(i -> "Response name " + i).toList();
    }

    @ParameterizedTest(name = "{0} keeps its unwrapped entity and 200/empty-delete contracts")
    @MethodSource("pools")
    void existingResponsesRemainUnwrappedWithTheirOriginalStatuses(String pool, Map<String, Object> row)
            throws Exception {
        String path = "/api/" + pool;
        String json = mapper.writeValueAsString(row);
        String created = mvc.perform(post(path).contentType(MediaType.APPLICATION_JSON).content(json))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").isNumber())
                .andExpect(jsonPath("$.createdAt").isString())
                .andReturn().getResponse().getContentAsString();
        JsonNode entity = mapper.readTree(created);
        ObjectNode expected = mapper.valueToTree(row);
        if (pool.equals("scoresheet")) {
            expected.set("matchLabel", expected.remove("match"));
        }
        ObjectNode payload = ((ObjectNode) entity).deepCopy();
        payload.remove(List.of("id", "createdAt"));
        assertEquals(expected, payload);
        long id = entity.get("id").asLong();

        String updated = mvc.perform(put(path + "/" + id).header("X-Admin-Password", ADMIN_PASSWORD)
                        .contentType(MediaType.APPLICATION_JSON).content(json))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        assertEquals(entity, mapper.readTree(updated));
        mvc.perform(get(path)).andExpect(status().isOk()).andExpect(jsonPath("$").isArray());
        mvc.perform(get(path + "/all")).andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isArray()).andExpect(jsonPath("$.totalElements").isNumber());
        mvc.perform(post(path + "/bulk").contentType(MediaType.APPLICATION_JSON).content("[]"))
                .andExpect(status().isOk()).andExpect(content().json("[]"));
        mvc.perform(delete(path + "/" + id).header("X-Admin-Password", ADMIN_PASSWORD))
                .andExpect(status().isOk()).andExpect(content().string(""));
        mvc.perform(delete(path + "/" + id).header("X-Admin-Password", ADMIN_PASSWORD))
                .andExpect(status().isNotFound());
    }

    @ParameterizedTest(name = "{0} inherits typed bulk preview and commit")
    @MethodSource("pools")
    void inheritedBulkBindsRowsAndPreservesPreviewAndCommitContracts(String pool, Map<String, Object> row)
            throws Exception {
        String path = "/api/" + pool;
        String json = mapper.writeValueAsString(List.of(row));
        long before = mapper.readTree(mvc.perform(get(path + "/all")).andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString()).get("totalElements").asLong();

        mvc.perform(post(path + "/bulk").contentType(MediaType.APPLICATION_JSON).content(json))
                .andExpect(status().isOk())
                .andExpect(content().json("[{\"index\":0,\"ok\":true,\"errors\":[]}]"))
                .andExpect(jsonPath("$[0].id").doesNotExist());
        mvc.perform(get(path + "/all")).andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(before));

        String result = mvc.perform(post(path + "/bulk").param("dryRun", "false")
                        .contentType(MediaType.APPLICATION_JSON).content(json))
                .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].index").value(0)).andExpect(jsonPath("$[0].ok").value(true))
                .andExpect(jsonPath("$[0].errors").isEmpty()).andExpect(jsonPath("$[0].id").isNumber())
                .andReturn().getResponse().getContentAsString();
        long id = mapper.readTree(result).get(0).get("id").asLong();
        mvc.perform(get(path + "/all")).andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(before + 1));
        String updated = mvc.perform(put(path + "/" + id).header("X-Admin-Password", ADMIN_PASSWORD)
                        .contentType(MediaType.APPLICATION_JSON).content(mapper.writeValueAsString(row)))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        ObjectNode expected = mapper.valueToTree(row);
        if (pool.equals("scoresheet")) {
            expected.set("matchLabel", expected.remove("match"));
        }
        ObjectNode payload = (ObjectNode) mapper.readTree(updated);
        payload.remove(List.of("id", "createdAt"));
        assertEquals(expected, payload);
    }

    @ParameterizedTest(name = "{0} rejects missing and incorrect credentials before mutation")
    @MethodSource("pools")
    void inheritedMutationsUseTheConfiguredAdminGate(String pool, Map<String, Object> row) throws Exception {
        String path = "/api/" + pool;
        String json = mapper.writeValueAsString(row);
        String created = mvc.perform(post(path).contentType(MediaType.APPLICATION_JSON).content(json))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        long id = mapper.readTree(created).get("id").asLong();

        mvc.perform(put(path + "/" + id).contentType(MediaType.APPLICATION_JSON).content(json))
                .andExpect(status().isUnauthorized());
        mvc.perform(delete(path + "/" + id)).andExpect(status().isUnauthorized());
        for (String password : List.of("wrong-password", "admin")) {
            mvc.perform(put(path + "/" + id).header("X-Admin-Password", password)
                            .contentType(MediaType.APPLICATION_JSON).content(json))
                    .andExpect(status().isUnauthorized());
            mvc.perform(delete(path + "/" + id).header("X-Admin-Password", password))
                    .andExpect(status().isUnauthorized());
        }
        String unchanged = mvc.perform(put(path + "/" + id).header("X-Admin-Password", ADMIN_PASSWORD)
                        .contentType(MediaType.APPLICATION_JSON).content(json))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        assertEquals(mapper.readTree(created), mapper.readTree(unchanged));
    }
}
