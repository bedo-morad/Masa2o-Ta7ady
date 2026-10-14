package com.ta7ady.backend.service;

import com.ta7ady.backend.entity.IhbidQuestion;
import com.ta7ady.backend.repository.IhbidQuestionRepository;
import com.ta7ady.backend.web.BulkRowResult;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class IhbidService {
    // Bodies larger than this are rejected with 413 instead of being processed.
    public static final int MAX_BULK_ROWS = 1000;

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
    public List<BulkRowResult> bulk(List<Map<String, Object>> rows, boolean dryRun) {
        if (rows == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "body must be a JSON array");
        }
        if (rows.size() > MAX_BULK_ROWS) {
            throw new ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE,
                    "bulk body too large (max " + MAX_BULK_ROWS + " rows)");
        }
        Map<String, Integer> firstSeen = new HashMap<>();
        List<IhbidQuestion> toSave = new ArrayList<>();
        List<Integer> saveIndex = new ArrayList<>();
        List<BulkRowResult> results = new ArrayList<>();
        for (int i = 0; i < rows.size(); i++) {
            Map<String, Object> row = rows.get(i);
            String question = str(row == null ? null : row.get("questionText"));
            String answer = str(row == null ? null : row.get("answerText"));
            List<String> errors = new ArrayList<>(validate(question, answer));
            String key = question == null ? "" : question.trim().toLowerCase();
            if (errors.isEmpty() && !key.isEmpty()) {
                if (firstSeen.containsKey(key)) {
                    errors.add("duplicate of row " + firstSeen.get(key) + " in batch");
                } else {
                    firstSeen.put(key, i);
                }
            }
            if (errors.isEmpty() && !dryRun) {
                IhbidQuestion e = new IhbidQuestion();
                e.setQuestionText(question.trim());
                e.setAnswerText(answer.trim());
                toSave.add(e);
                saveIndex.add(i);
                results.add(null); // placeholder, filled with id after save
            } else {
                results.add(new BulkRowResult(i, errors.isEmpty(), errors, null));
            }
        }
        if (!dryRun) {
            for (int k = 0; k < toSave.size(); k++) {
                IhbidQuestion saved = repo.save(toSave.get(k));
                int i = saveIndex.get(k);
                results.set(i, new BulkRowResult(i, true, List.of(), saved.getId()));
            }
        }
        return results;
    }

    private static String str(Object raw) {
        return raw == null ? null : raw.toString();
    }

    public void delete(Long id) {
        if (!repo.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "not found");
        }
        repo.deleteById(id);
    }
}
