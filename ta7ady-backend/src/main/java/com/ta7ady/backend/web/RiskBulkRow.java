package com.ta7ady.backend.web;

import java.util.List;

// One risk pack row (AUTHORING.md §3.6): used by single-add, edit (PUT) and bulk.
public record RiskBulkRow(String genre, List<RiskQuestionRequest> questions) {
}
