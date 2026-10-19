package com.ta7ady.backend.dto;

import java.util.List;

// One row of a POST /api/top10/bulk body (AUTHORING.md §3.4).
public record Top10BulkRow(String prompt, List<String> answers) {
}
