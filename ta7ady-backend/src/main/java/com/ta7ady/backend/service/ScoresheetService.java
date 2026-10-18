package com.ta7ady.backend.service;

import com.ta7ady.backend.entity.ScoresheetMatch;
import com.ta7ady.backend.repository.ScoresheetMatchRepository;
import com.ta7ady.backend.bulk.BulkHelper;
import com.ta7ady.backend.bulk.BulkRowResult;
import com.ta7ady.backend.dto.ScoresheetBulkRow;
import java.util.ArrayList;
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
public class ScoresheetService {

    private final ScoresheetMatchRepository repo;

    public List<ScoresheetMatch> random(int count) {
        return repo.findRandom(normalizeCount(count));
    }

    static int normalizeCount(int count) {
        if (count < 1) return 1;
        if (count > 10) return 10;
        return count;
    }

    public Page<ScoresheetMatch> all(Pageable pageable) {
        return repo.findAll(pageable);
    }

    public ScoresheetMatch create(String matchLabel, String teamA, String teamB, List<?> lineupA, List<?> lineupB) {
        List<String> errors = validate(matchLabel, teamA, teamB, lineupA, lineupB);
        if (!errors.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, String.join("; ", errors));
        }
        return repo.save(toEntity(matchLabel, teamA, teamB, lineupA, lineupB));
    }

    // AUTHORING.md single-add/bulk row keys: "match" (+ "matchLabel"/"match_label" aliases).
    public static String matchOf(Map<String, Object> body) {
        if (body == null) return null;
        Object m = body.get("match");
        if (m == null) m = body.get("matchLabel");
        if (m == null) m = body.get("match_label");
        return m == null ? null : m.toString();
    }

    // Admin-gated edit (SPECV3 §3.1): same validation as create, applied instantly.
    public ScoresheetMatch update(Long id, String matchLabel, String teamA, String teamB,
            List<?> lineupA, List<?> lineupB) {
        ScoresheetMatch e = repo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "not found"));
        List<String> errors = validate(matchLabel, teamA, teamB, lineupA, lineupB);
        if (!errors.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, String.join("; ", errors));
        }
        e.setMatchLabel(matchLabel.trim());
        e.setTeamA(teamA.trim());
        e.setTeamB(teamB.trim());
        e.getLineupA().clear();
        e.getLineupA().addAll(cleaned(lineupA));
        e.getLineupB().clear();
        e.getLineupB().addAll(cleaned(lineupB));
        return repo.save(e);
    }

    // Pure validation shared by single POST and bulk (AUTHORING.md §3.5:
    // exactly 11+11 names, each >= 3 chars, distinct per side case-insensitively).
    public static List<String> validate(String matchLabel, String teamA, String teamB,
            List<?> lineupA, List<?> lineupB) {
        List<String> errors = new ArrayList<>();
        String m = matchLabel == null ? "" : matchLabel.trim();
        if (m.length() < 3) {
            errors.add("match must be at least 3 characters");
        }
        String a = teamA == null ? "" : teamA.trim();
        if (a.length() < 3) {
            errors.add("teamA must be at least 3 characters");
        }
        String b = teamB == null ? "" : teamB.trim();
        if (b.length() < 3) {
            errors.add("teamB must be at least 3 characters");
        }
        errors.addAll(validateLineup("lineupA", lineupA));
        errors.addAll(validateLineup("lineupB", lineupB));
        return errors;
    }

    private static List<String> validateLineup(String field, List<?> lineup) {
        List<String> errors = new ArrayList<>();
        if (lineup == null || lineup.size() != 11) {
            errors.add(field + " must contain exactly 11 entries");
            return errors;
        }
        Set<String> seen = new HashSet<>();
        for (int i = 0; i < lineup.size(); i++) {
            Object raw = lineup.get(i);
            String name = raw == null ? "" : raw.toString().trim();
            if (name.length() < 3) {
                errors.add(field + " entry " + (i + 1) + " must be at least 3 characters");
            } else if (!seen.add(name.toLowerCase())) {
                errors.add(field + " entry " + (i + 1) + " is a duplicate");
            }
        }
        return errors;
    }

    // Bulk import (SPECV2 §2.1): dryRun=true previews without saving anything;
    // dryRun=false saves only valid rows. In-batch duplicate match labels rejected.
    public List<BulkRowResult> bulk(List<ScoresheetBulkRow> rows, boolean dryRun) {
        return BulkHelper.run(rows, dryRun,
                r -> validate(r == null ? null : r.match(), r == null ? null : r.teamA(),
                        r == null ? null : r.teamB(), r == null ? null : r.lineupA(),
                        r == null ? null : r.lineupB()),
                r -> r == null ? null : r.match(),
                r -> toEntity(r.match(), r.teamA(), r.teamB(), r.lineupA(), r.lineupB()),
                e -> repo.save(e).getId());
    }

    public void delete(Long id) {
        if (!repo.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "not found");
        }
        repo.deleteById(id);
    }

    private static ScoresheetMatch toEntity(String matchLabel, String teamA, String teamB,
            List<?> lineupA, List<?> lineupB) {
        ScoresheetMatch e = new ScoresheetMatch();
        e.setMatchLabel(matchLabel.trim());
        e.setTeamA(teamA.trim());
        e.setTeamB(teamB.trim());
        e.setLineupA(cleaned(lineupA));
        e.setLineupB(cleaned(lineupB));
        return e;
    }

    private static List<String> cleaned(List<?> lineup) {
        List<String> clean = new ArrayList<>();
        for (Object raw : lineup) {
            clean.add(raw == null ? "" : raw.toString().trim());
        }
        return clean;
    }
}
