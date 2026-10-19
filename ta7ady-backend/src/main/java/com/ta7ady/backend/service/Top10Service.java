package com.ta7ady.backend.service;

import com.ta7ady.backend.entity.Top10List;
import com.ta7ady.backend.repository.Top10ListRepository;
import com.ta7ady.backend.bulk.BulkHelper;
import com.ta7ady.backend.bulk.BulkRowResult;
import com.ta7ady.backend.dto.Top10BulkRow;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
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
        return repo.save(applyTo(new Top10List(), prompt, answers));
    }

    // Admin-gated edit (SPECV3 §3.1): same validation as create, applied instantly.
    public Top10List update(Long id, String prompt, List<?> answers) {
        Top10List e = repo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "not found"));
        List<String> errors = validate(prompt, answers);
        if (!errors.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, String.join("; ", errors));
        }
        return repo.save(applyTo(e, prompt, answers));
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
    public List<BulkRowResult> bulk(List<Top10BulkRow> rows, boolean dryRun) {
        return BulkHelper.run(rows, dryRun,
                r -> validate(r == null ? null : r.prompt(), r == null ? null : r.answers()),
                r -> r == null ? null : r.prompt(),
                r -> applyTo(new Top10List(), r.prompt(), r.answers()),
                e -> repo.save(e).getId());
    }

    public void delete(Long id) {
        if (!repo.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "not found");
        }
        repo.deleteById(id);
    }

    private static Top10List applyTo(Top10List e, String prompt, List<?> answers) {
        e.setPrompt(prompt.trim());
        e.getAnswers().clear();
        e.getAnswers().addAll(cleaned(answers));
        return e;
    }

    private static List<String> cleaned(List<?> answers) {
        List<String> clean = new ArrayList<>();
        for (Object raw : answers) {
            clean.add(raw == null ? "" : raw.toString().trim());
        }
        return clean;
    }
}
