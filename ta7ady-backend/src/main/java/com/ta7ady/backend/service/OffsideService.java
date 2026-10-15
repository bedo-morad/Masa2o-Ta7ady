package com.ta7ady.backend.service;

import com.ta7ady.backend.entity.OffsideRule;
import com.ta7ady.backend.repository.OffsideRuleRepository;
import com.ta7ady.backend.web.BulkHelper;
import com.ta7ady.backend.web.BulkRowResult;
import com.ta7ady.backend.web.OffsideBulkRow;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class OffsideService {

    private final OffsideRuleRepository repo;

    public List<OffsideRule> random10() {
        return repo.findRandom(10);
    }

    public List<OffsideRule> random(int count) {
        return repo.findRandom(normalizeCount(count));
    }

    private int normalizeCount(int count) {
        if (count < 1) return 1;
        if (count > 50) return 50;
        return count;
    }

    public Page<OffsideRule> all(Pageable pageable) {
        return repo.findAll(pageable);
    }

    public OffsideRule create(String raw) {
        List<String> errors = validate(raw);
        if (!errors.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, String.join("; ", errors));
        }
        OffsideRule e = new OffsideRule();
        e.setRuleText(raw.trim());
        return repo.save(e);
    }

    // Admin-gated edit (SPECV3 §3.1): same validation as create, applied instantly.
    public OffsideRule update(Long id, String raw) {
        OffsideRule e = repo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "not found"));
        List<String> errors = validate(raw);
        if (!errors.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, String.join("; ", errors));
        }
        e.setRuleText(raw.trim());
        return repo.save(e);
    }

    // Pure shape validation shared by single POST and bulk (no DB touch;
    // single POST has no dedupe, so bulk adds in-batch dedupe on top).
    public static List<String> validate(String raw) {
        String value = raw == null ? "" : raw.trim();
        if (value.length() < 3) {
            return List.of("rule must be at least 3 characters");
        }
        return List.of();
    }

    // Bulk import (SPECV2 §2.1): dryRun=true previews without saving anything;
    // dryRun=false saves only valid rows. In-batch duplicate rules rejected.
    public List<BulkRowResult> bulk(List<OffsideBulkRow> rows, boolean dryRun) {
        return BulkHelper.run(rows, dryRun,
                r -> validate(r == null ? null : r.ruleText()),
                r -> r == null ? null : r.ruleText(),
                r -> {
                    OffsideRule e = new OffsideRule();
                    e.setRuleText(r.ruleText().trim());
                    return e;
                },
                e -> repo.save(e).getId());
    }

    public void delete(Long id) {
        if (!repo.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "not found");
        }
        repo.deleteById(id);
    }
}
