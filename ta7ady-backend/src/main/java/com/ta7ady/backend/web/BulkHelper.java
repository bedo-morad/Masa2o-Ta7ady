package com.ta7ady.backend.web;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

// Shared mechanics for POST /api/{pool}/bulk (SPECV2 §2.1, SPECV3 §3.0.1):
// the 413 size guard, in-batch dedupe, dry-run handling and the
// placeholder-then-save passes. Each pool supplies only its row parsing
// (validate, dedupe key, entity) and save.
public final class BulkHelper {
    // Bodies larger than this are rejected with 413 instead of being processed.
    public static final int MAX_BULK_ROWS = 1000;

    private BulkHelper() {
    }

    public static <R, T> List<BulkRowResult> run(
            List<R> rows,
            boolean dryRun,
            Function<R, List<String>> validate,
            Function<R, String> key,
            Function<R, T> toEntity,
            Function<T, Long> save) {
        if (rows == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "body must be a JSON array");
        }
        if (rows.size() > MAX_BULK_ROWS) {
            throw new ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE,
                    "bulk body too large (max " + MAX_BULK_ROWS + " rows)");
        }
        Map<String, Integer> firstSeen = new HashMap<>();
        List<T> toSave = new ArrayList<>();
        List<Integer> saveIndex = new ArrayList<>();
        List<BulkRowResult> results = new ArrayList<>();
        for (int i = 0; i < rows.size(); i++) {
            R row = rows.get(i);
            List<String> errors = new ArrayList<>(validate.apply(row));
            String rawKey = key.apply(row);
            String dedupeKey = rawKey == null ? "" : rawKey.trim().toLowerCase();
            if (errors.isEmpty() && !dedupeKey.isEmpty()) {
                if (firstSeen.containsKey(dedupeKey)) {
                    errors.add("duplicate of row " + firstSeen.get(dedupeKey) + " in batch");
                } else {
                    firstSeen.put(dedupeKey, i);
                }
            }
            if (errors.isEmpty() && !dryRun) {
                toSave.add(toEntity.apply(row));
                saveIndex.add(i);
                results.add(null); // placeholder, filled with id after save
            } else {
                results.add(new BulkRowResult(i, errors.isEmpty(), errors, null));
            }
        }
        if (!dryRun) {
            for (int k = 0; k < toSave.size(); k++) {
                Long id = save.apply(toSave.get(k));
                int i = saveIndex.get(k);
                results.set(i, new BulkRowResult(i, true, List.of(), id));
            }
        }
        return results;
    }

    // Shared request-body readers for the Map-based single-add endpoints.
    public static String str(Object raw) {
        return raw == null ? null : raw.toString();
    }

    public static List<?> list(Object raw) {
        return raw instanceof List ? (List<?>) raw : null;
    }
}
