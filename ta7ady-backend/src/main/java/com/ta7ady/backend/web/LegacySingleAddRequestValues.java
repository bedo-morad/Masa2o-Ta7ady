package com.ta7ady.backend.web;

import java.util.List;

/** Readers shared only by the approved legacy single-add request parsers. */
final class LegacySingleAddRequestValues {
    private LegacySingleAddRequestValues() {
    }

    static String text(Object raw) {
        return raw == null ? null : raw.toString();
    }

    static List<?> list(Object raw) {
        return raw instanceof List ? (List<?>) raw : null;
    }
}
