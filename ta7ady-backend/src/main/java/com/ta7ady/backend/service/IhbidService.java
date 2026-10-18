package com.ta7ady.backend.service;

import com.ta7ady.backend.entity.IhbidQuestion;
import com.ta7ady.backend.repository.IhbidQuestionRepository;
import com.ta7ady.backend.bulk.BulkHelper;
import com.ta7ady.backend.bulk.BulkRowResult;
import com.ta7ady.backend.dto.IhbidBulkRow;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class IhbidService {

    private final IhbidQuestionRepository repo;

    public List<IhbidQuestion> random10() {
        return repo.findRandom(10);
    }

    public List<IhbidQuestion> random(int count) {
        return repo.findRandom(normalizeCount(count));
    }

    private int normalizeCount(int count) {
        if (count < 1) return 1;
        if (count > 50) return 50;
        return count;
    }

    public Page<IhbidQuestion> all(Pageable pageable) {
        return repo.findAll(pageable);
    }

    public IhbidQuestion create(String question, String answer) {
        List<String> errors = validate(question, answer);
        if (!errors.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, String.join("; ", errors));
        }
        IhbidQuestion e = new IhbidQuestion();
        e.setQuestionText(question.trim());
        e.setAnswerText(answer.trim());
        return repo.save(e);
    }

    // Admin-gated edit (SPECV3 §3.1): same validation as create, applied instantly.
    public IhbidQuestion update(Long id, String question, String answer) {
        IhbidQuestion e = repo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "not found"));
        List<String> errors = validate(question, answer);
        if (!errors.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, String.join("; ", errors));
        }
        e.setQuestionText(question.trim());
        e.setAnswerText(answer.trim());
        return repo.save(e);
    }

    // Pure shape validation shared by single POST and bulk (no DB touch;
    // single POST has no dedupe, so bulk adds in-batch dedupe on top).
    public static List<String> validate(String question, String answer) {
        String q = question == null ? "" : question.trim();
        String a = answer == null ? "" : answer.trim();
        if (q.length() < 3 || a.length() < 1) {
            return List.of("question must be >=3 chars and answer must not be empty");
        }
        return List.of();
    }

    // Bulk import (SPECV2 §2.1): dryRun=true previews without saving anything;
    // dryRun=false saves only valid rows. In-batch duplicate questions rejected.
    public List<BulkRowResult> bulk(List<IhbidBulkRow> rows, boolean dryRun) {
        return BulkHelper.run(rows, dryRun,
                r -> validate(r == null ? null : r.questionText(), r == null ? null : r.answerText()),
                r -> r == null ? null : r.questionText(),
                r -> {
                    IhbidQuestion e = new IhbidQuestion();
                    e.setQuestionText(r.questionText().trim());
                    e.setAnswerText(r.answerText().trim());
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
