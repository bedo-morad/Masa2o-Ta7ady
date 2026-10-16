package com.ta7ady.backend.service;

import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

// SPECV4 §4.3: exactly 11 distinct names + a valid hotlink URL, draw default 1 clamp 1–5.
class WhoPictureValidationTest {

    static List<String> players11(String prefix) {
        List<String> names = new ArrayList<>();
        for (int i = 1; i <= 11; i++) {
            names.add(prefix + " " + String.format("%02d", i));
        }
        return names;
    }

    // ---- 11-name enforcement ----

    @Test
    void validPhotoPasses() {
        assertTrue(WhoPictureService.validate(
                "https://example.com/team-photo.jpg", players11(" Valid Player")).isEmpty());
    }

    @Test
    void rejectsFewerOrMoreThan11Names() {
        String url = "https://example.com/team-photo.jpg";
        assertTrue(WhoPictureService.validate(url, players11("Short").subList(0, 10))
                .stream().anyMatch(e -> e.contains("exactly 11")));
        List<String> twelve = players11("Long");
        twelve.add("Long 12 extra");
        assertTrue(WhoPictureService.validate(url, twelve).stream().anyMatch(e -> e.contains("exactly 11")));
        assertTrue(WhoPictureService.validate(url, null).stream().anyMatch(e -> e.contains("exactly 11")));
    }

    @Test
    void rejectsCaseInsensitiveDuplicateNames() {
        List<String> names = players11("Dup");
        names.set(0, names.get(10).toUpperCase());
        List<String> errors = WhoPictureService.validate("https://example.com/p.jpg", names);
        // The first occurrence is accepted; the second one is flagged.
        assertTrue(errors.stream().anyMatch(e -> e.contains("entry 11 is a duplicate")));
        assertFalse(errors.stream().anyMatch(e -> e.contains("entry 1 is a duplicate")));
    }

    @Test
    void rejectsShortAndBlankNames() {
        List<String> names = players11("Short Name");
        names.set(3, "ab");
        names.set(7, "   ");
        List<String> errors = WhoPictureService.validate("https://example.com/p.jpg", names);
        assertTrue(errors.stream().anyMatch(e -> e.contains("entry 4 must be at least 3 characters")));
        assertTrue(errors.stream().anyMatch(e -> e.contains("entry 8 must be at least 3 characters")));
    }

    // ---- URL presence + shape (hotlink only, no uploads) ----

    @Test
    void rejectsMissingOrEmptyUrl() {
        assertTrue(WhoPictureService.validate(null, players11("U")).stream()
                .anyMatch(e -> e.contains("photoUrl")));
        assertTrue(WhoPictureService.validate("  ", players11("U")).stream()
                .anyMatch(e -> e.contains("photoUrl")));
        assertEquals(2, WhoPictureService.validate("", null).size());
    }

    @Test
    void rejectsMalformedOrNonHttpUrls() {
        List<String> noShape = List.of("not-a-url", "example.com/photo.jpg", "://missing-scheme",
                "https://", "ftp://example.com/photo.jpg", "photo url with spaces.jpg");
        for (String url : noShape) {
            assertFalse(WhoPictureService.validHttpUrl(url), url);
        }
        List<String> withHost = List.of("http://x.co/a.jpg", "HTTPS://EXAMPLE.COM/A.JPG");
        for (String url : withHost) {
            assertTrue(WhoPictureService.validHttpUrl(url), url);
        }
        assertTrue(WhoPictureService.validate("example.com", players11("V"))
                .stream().anyMatch(e -> e.contains("valid http(s) URL")));
        // Three chars but not a URL → shape error, not length error.
        assertTrue(WhoPictureService.validate("abc", players11("V"))
                .stream().anyMatch(e -> e.contains("valid http(s) URL")));
    }

    // ---- count defaults / clamps (default 1, 1–5) ----

    @Test
    void countClampIs1To5() {
        assertEquals(1, WhoPictureService.normalizeCount(0));
        assertEquals(1, WhoPictureService.normalizeCount(-3));
        assertEquals(1, WhoPictureService.normalizeCount(1));
        assertEquals(3, WhoPictureService.normalizeCount(3));
        assertEquals(5, WhoPictureService.normalizeCount(5));
        assertEquals(5, WhoPictureService.normalizeCount(6));
        assertEquals(5, WhoPictureService.normalizeCount(500));
    }
}
