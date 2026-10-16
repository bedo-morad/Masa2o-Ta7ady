package com.ta7ady.backend.web;

// One tiered question inside a Risk pack (AUTHORING.md §3.6). points is the tier:
// 5/10/20/40, in order.
public record RiskQuestionRequest(Integer points, String question, String answer) {
}
