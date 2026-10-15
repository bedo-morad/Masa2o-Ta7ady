package com.ta7ady.backend.web;

// One row of a POST /api/ihbid/bulk body (AUTHORING.md §3.2).
public record IhbidBulkRow(String questionText, String answerText) {
}
