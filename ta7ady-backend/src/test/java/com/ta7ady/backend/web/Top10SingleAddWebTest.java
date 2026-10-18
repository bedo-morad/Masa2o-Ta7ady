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
class Top10SingleAddWebTest {
    @Autowired
    MockMvc mvc;

    private final ObjectMapper mapper = new ObjectMapper();

    @Test
    void acceptsScalarPromptAndListAnswers() throws Exception {
        mvc.perform(post("/api/top10").contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(row("Top scorers ever", answers13()))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.prompt").value("Top scorers ever"))
                .andExpect(jsonPath("$.answers", hasSize(13)));
    }

    @Test
    void coercesNumericPromptAndAnswerValuesToStrings() throws Exception {
        Map<String, Object> body = row(123, answers13());
        body.put("answers", numericAnswers13());
        mvc.perform(post("/api/top10").contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(body)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.prompt").value("123"))
                .andExpect(jsonPath("$.answers[0]").value("101"));
    }

    @Test
    void rejectsMissingAndWrongPromptOrAnswersFieldsWithBadRequest() throws Exception {
        Map<String, Object> missingPrompt = row(null, answers13());
        missingPrompt.remove("prompt");
        postJson(missingPrompt).andExpect(status().isBadRequest());
        postJson(row("Top scorers ever", "not a list")).andExpect(status().isBadRequest());
        postJson(row("Top scorers ever", null)).andExpect(status().isBadRequest());
    }

    @Test
    void unknownAliasesDoNotPopulateCanonicalFields() throws Exception {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("question", "Top scorers ever");
        body.put("items", answers13());
        postJson(body).andExpect(status().isBadRequest());
    }

    @Test
    void malformedAndNonObjectBodiesAreBadRequest() throws Exception {
        mvc.perform(post("/api/top10").contentType(MediaType.APPLICATION_JSON).content("{"))
                .andExpect(status().isBadRequest());
        mvc.perform(post("/api/top10").contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(List.of(row("Top scorers ever", answers13())))))
                .andExpect(status().isBadRequest());
        mvc.perform(post("/api/top10").contentType(MediaType.APPLICATION_JSON).content("null"))
                .andExpect(status().isBadRequest());
    }

    private org.springframework.test.web.servlet.ResultActions postJson(Object body) throws Exception {
        return mvc.perform(post("/api/top10").contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(body)));
    }

    private static Map<String, Object> row(Object prompt, Object answers) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("prompt", prompt);
        body.put("answers", answers);
        return body;
    }

    private static List<String> answers13() {
        List<String> answers = new ArrayList<>();
        for (int i = 1; i <= 13; i++) answers.add("Answer " + String.format("%02d", i));
        return answers;
    }

    private static List<Integer> numericAnswers13() {
        List<Integer> answers = new ArrayList<>();
        for (int i = 1; i <= 13; i++) answers.add(100 + i);
        return answers;
    }
}
