package com.ta7ady.backend.service;

import com.ta7ady.backend.entity.RiskPack;
import com.ta7ady.backend.entity.RiskTierQuestion;
import com.ta7ady.backend.repository.RiskPackRepository;
import com.ta7ady.backend.bulk.BulkHelper;
import com.ta7ady.backend.bulk.BulkRowResult;
import com.ta7ady.backend.dto.RiskBulkRow;
import com.ta7ady.backend.dto.RiskQuestionRequest;
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
public class RiskService {
    // One board = 4 packs = 16 questions; a genre reroll fetches one fresh pack.
    static final int MAX_COUNT = 12;

    // A pack is exactly one question per tier, in this order.
    static final int[] TIERS = {5, 10, 20, 40};

    private final RiskPackRepository repo;

    public List<RiskPack> random(int count) {
        return repo.findRandom(normalizeCount(count));
    }

    static int normalizeCount(int count) {
        if (count < 1) return 1;
        if (count > MAX_COUNT) return MAX_COUNT;
        return count;
    }

    public Page<RiskPack> all(Pageable pageable) {
        return repo.findAll(pageable);
    }

    public RiskPack create(String genre, List<RiskQuestionRequest> questions) {
        List<String> errors = validate(genre, questions);
        if (!errors.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, String.join("; ", errors));
        }
        RiskPack e = new RiskPack();
        e.setGenre(genre.trim());
        e.setQuestions(toTiers(questions));
        return repo.save(e);
    }

    // Admin-gated edit (SPECV3 §3.1): same validation as create, applied instantly.
    public RiskPack update(Long id, String genre, List<RiskQuestionRequest> questions) {
        RiskPack e = repo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "not found"));
        List<String> errors = validate(genre, questions);
        if (!errors.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, String.join("; ", errors));
        }
        e.setGenre(genre.trim());
        e.getQuestions().clear();
        e.getQuestions().addAll(toTiers(questions));
        return repo.save(e);
    }

    // Pure validation shared by single POST, edit (PUT) and bulk (AUTHORING.md §3.6:
    // one genre, exactly 4 tiers in order 5/10/20/40, distinct questions). Genres may
    // duplicate across packs, so no pack-level uniqueness is enforced here.
    public static List<String> validate(String genre, List<RiskQuestionRequest> questions) {
        List<String> errors = new ArrayList<>();
        String g = genre == null ? "" : genre.trim();
        if (g.length() < 3) {
            errors.add("genre must be at least 3 characters");
        }
        if (questions == null || questions.size() != 4) {
            errors.add("questions must contain exactly 4 tiers in order (5/10/20/40)");
            return errors;
        }
        Set<String> seen = new HashSet<>();
        for (int i = 0; i < TIERS.length; i++) {
            int tier = TIERS[i];
            RiskQuestionRequest q = questions.get(i);
            Integer points = q == null ? null : q.points();
            if (points == null || points != tier) {
                errors.add("tier " + (i + 1) + " must be " + tier + " points");
            }
            String text = q == null || q.question() == null ? "" : q.question().trim();
            String answer = q == null || q.answer() == null ? "" : q.answer().trim();
            if (text.length() < 3) {
                errors.add("tier " + tier + " question must be at least 3 characters");
            } else if (!seen.add(text.toLowerCase())) {
                errors.add("tier " + tier + " question is a duplicate");
            }
            if (answer.length() < 3) {
                errors.add("tier " + tier + " answer must be at least 3 characters");
            }
        }
        return errors;
    }

    // Bulk import (SPECV2 §2.1, SPECV3 §3.0.1): shared mechanics in BulkHelper. A pack
    // repeated in the same batch is rejected (genre duplicates alone are allowed, the
    // full pack is the unique entry).
    public List<BulkRowResult> bulk(List<RiskBulkRow> rows, boolean dryRun) {
        return BulkHelper.run(rows, dryRun,
                r -> validate(r == null ? null : r.genre(), r == null ? null : r.questions()),
                r -> signature(r == null ? null : r.genre(), r == null ? null : r.questions()),
                r -> {
                    RiskPack e = new RiskPack();
                    e.setGenre(r.genre().trim());
                    e.setQuestions(toTiers(r.questions()));
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

    // Identity of a pack: its genre plus every tier question, case-insensitively.
    private static String signature(String genre, List<RiskQuestionRequest> questions) {
        StringBuilder sb = new StringBuilder(genre == null ? "" : genre.trim().toLowerCase());
        if (questions != null) {
            for (RiskQuestionRequest q : questions) {
                sb.append('\u0001');
                sb.append(q == null || q.question() == null ? "" : q.question().trim().toLowerCase());
            }
        }
        return sb.toString();
    }

    private static List<RiskTierQuestion> toTiers(List<RiskQuestionRequest> questions) {
        List<RiskTierQuestion> tiers = new ArrayList<>();
        for (RiskQuestionRequest q : questions) {
            tiers.add(new RiskTierQuestion(q.points(), q.question().trim(), q.answer().trim()));
        }
        return tiers;
    }
}
