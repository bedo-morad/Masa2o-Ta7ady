package com.ta7ady.backend.web;

import java.util.List;
import java.util.Map;

/**
 * Compatibility boundary for the legacy map-shaped Top10 single-add request.
 *
 * <p>This parser deliberately preserves the endpoint's existing coercion: the
 * prompt uses {@code Object.toString()} (including maps and lists), while
 * answers are passed through only when the raw value is a JSON list. Validation
 * remains owned by {@code Top10Service}.</p>
 */
public final class Top10SingleAddRequestParser {
    private Top10SingleAddRequestParser() {
    }

    public static Request parse(Map<String, Object> body) {
        if (body == null) {
            return new Request(null, null);
        }
        return new Request(LegacySingleAddRequestValues.text(body.get("prompt")),
                LegacySingleAddRequestValues.list(body.get("answers")));
    }

    public record Request(String prompt, List<?> answers) {
    }
}
