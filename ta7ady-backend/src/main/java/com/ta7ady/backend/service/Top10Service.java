package com.ta7ady.backend.service;

import com.ta7ady.backend.entity.Top10List;
import com.ta7ady.backend.repository.Top10ListRepository;
import com.ta7ady.backend.web.BulkRowResult;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class Top10Service {
    // Bodies larger than this are rejected with 413 instead of being processed.
    public static final int MAX_BULK_ROWS = 1000;

    private final Top10ListRepository repo;

    public List<Top10List> random(int count) {
        return repo.findRandom(normalizeCount(count));
    }

    static int normalizeCount(int count) {
        if (count < 1) return 1;
        if (count > 50) return 50;
        return count;
    }

    public Page<Top10List> all(Pageable pageable) {
        return repo.findAll(pageable);
    }

    public Top10List create(String prompt, List<?> answers) {
        List<String> errors = validate(prompt, answers);
        if (!errors.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, String.join("; ", errors));
        }
        return repo.save(toEntity(prompt, answers));
    }

    // Pure validation shared by single POST and bulk (AUTHORING.md §3.4:
    // exactly 13 ordered answers, each >= 3 chars, distinct case-insensitively).
    public static List<String> validate(String prompt, List<?> answers) {
        List<String> errors = new ArrayList<>();
        String p = prompt == null ? "" : prompt.trim();
        if (p.length() < 3) {
            errors.add("prompt must be at least 3 characters");
        }
        if (answers == null || answers.size() != 13) {
            errors.add("answers must contain exactly 13 entries");
            return errors;
        }
        Set<String> seen = new HashSet<>();
        for (int i = 0; i < answers.size(); i++) {
            Object raw = answers.get(i);
            String a = raw == null ? "" : raw.toString().trim();
            if (a.length() < 3) {
                errors.add("answer " + (i + 1) + " must be at least 3 characters");
            } else if (!seen.add(a.toLowerCase())) {
                errors.add("answer " + (i + 1) + " is a duplicate");
            }
        }
        return errors;
    }

    // Bulk import (SPECV2 §2.1): dryRun=true previews without saving anything;
    // dryRun=false saves only valid rows. In-batch duplicate prompts rejected.
    public List<BulkRowResult> bulk(List<Map<String, Object>> rows, boolean dryRun) {
        if (rows == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "body must be a JSON array");
        }
        if (rows.size() > MAX_BULK_ROWS) {
            throw new ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE,
                    "bulk body too large (max " + MAX_BULK_ROWS + " rows)");
        }
        Map<String, Integer> firstSeen = new HashMap<>();
        List<Top10List> toSave = new ArrayList<>();
        List<Integer> saveIndex = new ArrayList<>();
        List<BulkRowResult> results = new ArrayList<>();
        for (int i = 0; i < rows.size(); i++) {
            Map<String, Object> row = rows.get(i);
            String prompt = str(row == null ? null : row.get("prompt"));
            List<?> answers = list(row == null ? null : row.get("answers"));
            List<String> errors = validate(prompt, answers);
            String key = prompt == null ? "" : prompt.trim().toLowerCase();
            if (!key.isEmpty()) {
                if (firstSeen.containsKey(key)) {
                    errors.add("duplicate of row " + firstSeen.get(key) + " in batch");
                } else {
                    firstSeen.put(key, i);
                }
            }
            if (errors.isEmpty() && !dryRun) {
                toSave.add(toEntity(prompt, answers));
                saveIndex.add(i);
                results.add(null); // placeholder, filled with id after save
            } else {
                results.add(new BulkRowResult(i, errors.isEmpty(), errors, null));
            }
        }
        if (!dryRun) {
            for (int k = 0; k < toSave.size(); k++) {
                Top10List saved = repo.save(toSave.get(k));
                int i = saveIndex.get(k);
                results.set(i, new BulkRowResult(i, true, List.of(), saved.getId()));
            }
        }
        return results;
    }

    public void delete(Long id) {
        if (!repo.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "not found");
        }
        repo.deleteById(id);
    }

    private static Top10List toEntity(String prompt, List<?> answers) {
        Top10List e = new Top10List();
        e.setPrompt(prompt.trim());
        List<String> clean = new ArrayList<>();
        for (Object raw : answers) {
            clean.add(raw == null ? "" : raw.toString().trim());
        }
        e.setAnswers(clean);
        return e;
    }

    private static String str(Object raw) {
        return raw == null ? null : raw.toString();
    }

    private static List<?> list(Object raw) {
        return raw instanceof List ? (List<?>) raw : null;
    }
}
