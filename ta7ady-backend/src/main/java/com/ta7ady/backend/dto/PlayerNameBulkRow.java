package com.ta7ady.backend.dto;

// One row of a POST /api/players/bulk body (AUTHORING.md §3.1).
public record PlayerNameBulkRow(String playerName) {
}
