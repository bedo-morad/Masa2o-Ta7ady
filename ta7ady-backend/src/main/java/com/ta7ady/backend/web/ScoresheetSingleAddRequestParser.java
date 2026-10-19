package com.ta7ady.backend.web;

import java.util.List;
import java.util.Map;

/**
 * Compatibility boundary for the legacy map-shaped Scoresheet single-add request.
 *
 * <p>The match aliases are intentionally resolved in the historical order
 * {@code match}, {@code matchLabel}, then {@code match_label}; a present null
 * value falls through to the next alias. Scalar fields retain raw
 * {@code Object.toString()} coercion, and lineup fields are retained only when
 * their raw values are lists. Validation remains owned by
 * {@code ScoresheetService}.</p>
 */
public final class ScoresheetSingleAddRequestParser {
    private ScoresheetSingleAddRequestParser() {
    }

    public static Request parse(Map<String, Object> body) {
        if (body == null) {
            return new Request(null, null, null, null, null);
        }
        return new Request(firstNonNull(body, "match", "matchLabel", "match_label"),
                LegacySingleAddRequestValues.text(body.get("teamA")),
                LegacySingleAddRequestValues.text(body.get("teamB")),
                LegacySingleAddRequestValues.list(body.get("lineupA")),
                LegacySingleAddRequestValues.list(body.get("lineupB")));
    }

    private static String firstNonNull(Map<String, Object> body, String... keys) {
        for (String key : keys) {
            Object raw = body.get(key);
            if (raw != null) {
                return LegacySingleAddRequestValues.text(raw);
            }
        }
        return null;
    }

    public record Request(String match, String teamA, String teamB,
            List<?> lineupA, List<?> lineupB) {
    }
}
