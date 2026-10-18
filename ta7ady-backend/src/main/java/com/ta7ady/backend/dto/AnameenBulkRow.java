package com.ta7ady.backend.dto;

import java.util.List;

// One row of a POST /api/anameen/bulk body (AUTHORING.md §3.8).
public record AnameenBulkRow(String player, List<String> clues) {
}
