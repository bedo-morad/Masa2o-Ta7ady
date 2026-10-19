package com.ta7ady.backend.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import java.util.List;

// One row of a POST /api/scoresheet/bulk body (AUTHORING.md §3.5).
// The canonical key is "match"; the legacy matchLabel/match_label aliases are
// accepted here by Jackson, replacing the old manual lookup in the service.
public record ScoresheetBulkRow(
        @JsonAlias({"matchLabel", "match_label"}) String match,
        String teamA,
        String teamB,
        List<String> lineupA,
        List<String> lineupB) {
}
