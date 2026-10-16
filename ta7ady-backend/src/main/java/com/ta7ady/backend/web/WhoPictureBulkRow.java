package com.ta7ady.backend.web;

import java.util.List;

// One who-in-picture photo row (AUTHORING.md §3.9): used by single-add, edit (PUT)
// and bulk. Names are exactly the 11 pictured players, any order.
public record WhoPictureBulkRow(String photoUrl, List<String> players) {
}
