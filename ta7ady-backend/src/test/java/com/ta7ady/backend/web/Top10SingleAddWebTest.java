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
class Top10SingleAddWebTest {
    @Autowired
    MockMvc mvc;

    private final ObjectMapper mapper = new ObjectMapper();

    @Test
    void acceptsScalarPromptAndListAnswers() throws Exception {
        postJson(top10("Top scorers ever", answers13()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.prompt").value("Top scorers ever"))
                .andExpect(jsonPath("$.answers", hasSize(13)));
    }

    @Test
    void coercesNumericPromptAndAnswerValuesToStrings() throws Exception {
        postJson(top10(mapper.getNodeFactory().numberNode(123), numericAnswers13()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.prompt").value("123"))
                .andExpect(jsonPath("$.answers[0]").value("101"));
    }

    @Test
    void canonicalPromptWinsAndUnknownAliasCannotFillNullCanonical() throws Exception {
        ObjectNode body = top10("Canonical prompt", answers13());
        body.put("question", "Alias-like prompt");
        postJson(body).andExpect(status().isOk())
                .andExpect(jsonPath("$.prompt").value("Canonical prompt"));

        ObjectNode nullCanonical = top10((String) null, answers13());
        nullCanonical.put("question", "Alias-like prompt");
        postJson(nullCanonical).andExpect(status().isBadRequest());
    }

    @Test
    void rejectsMissingWrongAndNullPromptOrAnswersFieldsWithBadRequest() throws Exception {
        ObjectNode missingPrompt = top10("Top scorers ever", answers13());
        missingPrompt.remove("prompt");
        postJson(missingPrompt).andExpect(status().isBadRequest());
        ObjectNode missingAnswers = top10("Top scorers ever", answers13());
        missingAnswers.remove("answers");
        postJson(missingAnswers).andExpect(status().isBadRequest());
        postJson(top10("Top scorers ever", mapper.getNodeFactory().textNode("not a list")))
                .andExpect(status().isBadRequest());
        postJson(top10("Top scorers ever", null)).andExpect(status().isBadRequest());
        postJson(top10("Top scorers ever", answers13Short())).andExpect(status().isBadRequest());
    }

    @Test
    void unknownAliasOnlyFieldsAreBadRequest() throws Exception {
        ObjectNode body = mapper.createObjectNode();
        body.put("question", "Top scorers ever");
        body.set("items", answers13());
        postJson(body).andExpect(status().isBadRequest());
    }

    @Test
    void malformedAndNonObjectBodiesAreBadRequest() throws Exception {
        postRaw("{").andExpect(status().isBadRequest());
        postJson(mapper.createArrayNode().add(top10("Top scorers ever", answers13())))
                .andExpect(status().isBadRequest());
        postRaw("null").andExpect(status().isBadRequest());
    }

    private org.springframework.test.web.servlet.ResultActions postJson(JsonNode body) throws Exception {
        return postRaw(mapper.writeValueAsString(body));
    }

    private org.springframework.test.web.servlet.ResultActions postRaw(String body) throws Exception {
        return mvc.perform(post("/api/top10").contentType(MediaType.APPLICATION_JSON).content(body));
    }

    private static ObjectNode top10(String prompt, JsonNode answers) {
        ObjectNode body = new ObjectMapper().createObjectNode();
        if (prompt == null) body.putNull("prompt"); else body.put("prompt", prompt);
        body.set("answers", answers);
        return body;
    }

    private static ObjectNode top10(JsonNode prompt, JsonNode answers) {
        ObjectNode body = new ObjectMapper().createObjectNode();
        body.set("prompt", prompt);
        body.set("answers", answers);
        return body;
    }

    private static ArrayNode answers13() {
        ArrayNode answers = new ObjectMapper().createArrayNode();
        for (int i = 1; i <= 13; i++) answers.add("Answer " + String.format("%02d", i));
        return answers;
    }

    private static ArrayNode answers13Short() {
        ArrayNode answers = answers13();
        answers.remove(12);
        return answers;
    }

    private static ArrayNode numericAnswers13() {
        ArrayNode answers = new ObjectMapper().createArrayNode();
        for (int i = 1; i <= 13; i++) answers.add(100 + i);
        return answers;
    }
}
