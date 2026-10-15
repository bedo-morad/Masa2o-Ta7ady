package com.ta7ady.backend.web;

// One bank row (AUTHORING.md §3.7): used by single-add, edit (PUT) and bulk.
public record BankBulkRow(String question, String answer) {
}
