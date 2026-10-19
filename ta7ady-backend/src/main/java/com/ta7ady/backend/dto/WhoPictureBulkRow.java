package com.ta7ady.backend.dto;

import java.util.List;

// One who-in-picture photo row (AUTHORING.md §3.9): used by single-add, edit (PUT)
// and bulk. Title = club/nation + year + competition (+ KO stage); names are exactly
// the 11 pictured players, any order.
public record WhoPictureBulkRow(String title, String photoUrl, List<String> players) {
}
