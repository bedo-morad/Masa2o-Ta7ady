package com.ta7ady.backend.web;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.util.List;

// One per-row verdict for POST /api/{pool}/bulk. dryRun=true previews without
// saving; dryRun=false saves valid rows and fills in their created ids.
@JsonInclude(JsonInclude.Include.NON_NULL)
public record BulkRowResult(int index, boolean ok, List<String> errors, Long id) {
}
