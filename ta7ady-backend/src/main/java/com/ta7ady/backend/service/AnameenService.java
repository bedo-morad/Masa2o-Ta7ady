package com.ta7ady.backend.service;

import com.ta7ady.backend.entity.AnameenSubject;
import com.ta7ady.backend.repository.AnameenSubjectRepository;
import com.ta7ady.backend.dto.AnameenBulkRow;
import com.ta7ady.backend.bulk.BulkHelper;
import com.ta7ady.backend.bulk.BulkRowResult;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class AnameenService {

    private final AnameenSubjectRepository repo;

    public List<AnameenSubject> random(int count) {
        return repo.findRandom(normalizeCount(count));
    }

    // Spec default 3, clamp 1-10 (SPECV4 §4.1).
    static int normalizeCount(int count) {
        if (count < 1) return 1;
        if (count > 10) return 10;
        return count;
    }

    public Page<AnameenSubject> all(Pageable pageable) {
        return repo.findAll(pageable);
    }

    public AnameenSubject create(String raw, List<?> clues) {
        List<String> errors = validate(raw, clues);
        if (!errors.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, String.join("; ", errors));
        }
        // Same player must not repeat across the pool (AUTHORING.md §2).
        String player = raw.trim();
        if (repo.existsByPlayerIgnoreCase(player)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "player already exists");
        }
        return saveGuarded(applyTo(new AnameenSubject(), player, clues));
    }

    // Admin-gated edit (SPECV3 §3.1): same validation as create, plus create's
    // duplicate rule (renaming onto another row's player is a 409).
    public AnameenSubject update(Long id, String raw, List<?> clues) {
        AnameenSubject e = repo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "not found"));
        List<String> errors = validate(raw, clues);
        if (!errors.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, String.join("; ", errors));
        }
        String player = raw.trim();
        if (!player.equalsIgnoreCase(e.getPlayer()) && repo.existsByPlayerIgnoreCase(player)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "player already exists");
        }
        return saveGuarded(applyTo(e, player, clues));
    }

    // Pure validation shared by single POST, edit (PUT) and bulk (no DB touch).
    // AUTHORING.md §3.8: exactly 5 ordered clues (hard -> easy), each >= 3 chars,
    // distinct case-insensitively; the player name follows the 3-char rule too.
    public static List<String> validate(String raw, List<?> clues) {
        List<String> errors = new ArrayList<>();
        String p = raw == null ? "" : raw.trim();
        if (p.length() < 3) {
            errors.add("player must be at least 3 characters");
        }
        if (clues == null || clues.size() != 5) {
            errors.add("clues must contain exactly 5 entries");
            return errors;
        }
        Set<String> seen = new HashSet<>();
        for (int i = 0; i < clues.size(); i++) {
            Object c = clues.get(i);
            String clue = c == null ? "" : c.toString().trim();
            if (clue.length() < 3) {
                errors.add("clue " + (i + 1) + " must be at least 3 characters");
            } else if (!seen.add(clue.toLowerCase())) {
                errors.add("clue " + (i + 1) + " is a duplicate");
            }
        }
        return errors;
    }

    // Bulk import (SPECV2 §2.1): shared mechanics in BulkHelper. Rejects duplicate
    // players in the batch and already in the DB.
    public List<BulkRowResult> bulk(List<AnameenBulkRow> rows, boolean dryRun) {
        return BulkHelper.run(rows, dryRun,
                r -> {
                    List<String> errors = new ArrayList<>(
                            validate(r == null ? null : r.player(), r == null ? null : r.clues()));
                    if (errors.isEmpty() && repo.existsByPlayerIgnoreCase(r.player().trim())) {
                        errors.add("player already exists");
                    }
                    return errors;
                },
                r -> r == null ? null : r.player(),
                r -> applyTo(new AnameenSubject(), r.player(), r.clues()),
                e -> saveGuarded(e).getId());
    }

    public void delete(Long id) {
        if (!repo.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "not found");
        }
        repo.deleteById(id);
    }

    private static AnameenSubject applyTo(AnameenSubject e, String player, List<?> clues) {
        e.setPlayer(player.trim());
        e.getClues().clear();
        e.getClues().addAll(cleaned(clues));
        return e;
    }

    // Last line of defence for the case-insensitive duplicate rule: the
    // pre-check on existsByPlayerIgnoreCase can lose a race with a concurrent
    // twin save, the uk_anameen_subject_player_key unique index cannot. The
    // first insert commits; the loser's violation maps to the same friendly
    // 409 the pre-check throws.
    private AnameenSubject saveGuarded(AnameenSubject e) {
        try {
            return repo.save(e);
        } catch (DataIntegrityViolationException dup) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "player already exists");
        }
    }

    private static List<String> cleaned(List<?> clues) {
        List<String> clean = new ArrayList<>();
        for (Object raw : clues) {
            clean.add(raw == null ? "" : raw.toString().trim());
        }
        return clean;
    }
}
