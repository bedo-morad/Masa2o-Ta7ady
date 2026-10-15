package com.ta7ady.backend.service;

import com.ta7ady.backend.entity.BankQuestion;
import com.ta7ady.backend.repository.BankQuestionRepository;
import com.ta7ady.backend.web.BankBulkRow;
import com.ta7ady.backend.web.BulkHelper;
import com.ta7ady.backend.web.BulkRowResult;
import java.util.ArrayList;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class BankService {
    // The game draws 72 once (6 rounds x 12); the clamp is the outer safety rail.
    static final int MAX_COUNT = 100;

    private final BankQuestionRepository repo;

    public List<BankQuestion> random(int count) {
        return repo.findRandom(normalizeCount(count));
    }

    static int normalizeCount(int count) {
        if (count < 1) return 1;
        if (count > MAX_COUNT) return MAX_COUNT;
        return count;
    }

    public Page<BankQuestion> all(Pageable pageable) {
        return repo.findAll(pageable);
    }

    public BankQuestion create(String question, String answer) {
        List<String> errors = validate(question, answer);
        if (!errors.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, String.join("; ", errors));
        }
        return repo.save(toEntity(question, answer));
    }

    // Admin-gated edit (SPECV3 §3.1): same validation as create, applied instantly.
    public BankQuestion update(Long id, String question, String answer) {
        BankQuestion e = repo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "not found"));
        List<String> errors = validate(question, answer);
        if (!errors.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, String.join("; ", errors));
        }
        e.setQuestion(question.trim());
        e.setAnswer(answer.trim());
        return repo.save(e);
    }

    // Pure shape validation shared by single POST, edit (PUT) and bulk (no DB touch).
    // Answers may be a single number or date, so only non-blank is required (Ihbid spirit).
    public static List<String> validate(String question, String answer) {
        List<String> errors = new ArrayList<>();
        String q = question == null ? "" : question.trim();
        String a = answer == null ? "" : answer.trim();
        if (q.length() < 3) {
            errors.add("question must be at least 3 characters");
        }
        if (a.isEmpty()) {
            errors.add("answer must not be empty");
        }
        return errors;
    }

    // Bulk import (SPECV2 §2.1, SPECV3 §3.0.1): shared mechanics in BulkHelper.
    // In-batch duplicate questions rejected.
    public List<BulkRowResult> bulk(List<BankBulkRow> rows, boolean dryRun) {
        return BulkHelper.run(rows, dryRun,
                r -> validate(r == null ? null : r.question(), r == null ? null : r.answer()),
                r -> r == null ? null : r.question(),
                r -> toEntity(r.question(), r.answer()),
                e -> repo.save(e).getId());
    }

    public void delete(Long id) {
        if (!repo.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "not found");
        }
        repo.deleteById(id);
    }

    private static BankQuestion toEntity(String question, String answer) {
        BankQuestion e = new BankQuestion();
        e.setQuestion(question.trim());
        e.setAnswer(answer.trim());
        return e;
    }
}
