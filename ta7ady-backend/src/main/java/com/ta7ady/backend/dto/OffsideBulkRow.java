package com.ta7ady.backend.dto;

// One row of a POST /api/offside/bulk body (AUTHORING.md §3.3).
public record OffsideBulkRow(String ruleText) {
}
