package com.ta7ady.backend.service;

import com.ta7ady.backend.entity.PlayerName;
import com.ta7ady.backend.repository.PlayerNameRepository;
import com.ta7ady.backend.bulk.BulkHelper;
import com.ta7ady.backend.bulk.BulkRowResult;
import com.ta7ady.backend.dto.PlayerNameBulkRow;
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
public class PlayerNameService {

    private final PlayerNameRepository repo;

    public List<PlayerName> random10() {
        return repo.findRandom(10);
    }

    public List<PlayerName> random(int count) {
        return repo.findRandom(normalizeCount(count));
    }

    private int normalizeCount(int count) {
        if (count < 1) return 1;
        if (count > 50) return 50;
        return count;
    }

    public Page<PlayerName> all(Pageable pageable) {
        return repo.findAll(pageable);
    }

    public PlayerName create(String raw) {
        List<String> errors = validate(raw);
        if (!errors.isEmpty()) {
            String message = errors.get(0);
            if (message.contains("already exists")) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, message);
            }
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
        }
        if (repo.existsByPlayerNameIgnoreCase(raw.trim())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "player name already exists");
        }
        return repo.save(applyTo(new PlayerName(), raw));
    }

    // Admin-gated edit (SPECV3 §3.1): same validation as create, plus create's
    // duplicate rule (renaming onto another row's name is a 409).
    public PlayerName update(Long id, String raw) {
        PlayerName e = repo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "not found"));
        List<String> errors = validate(raw);
        if (!errors.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, errors.get(0));
        }
        String value = raw.trim();
        if (!value.equalsIgnoreCase(e.getPlayerName()) && repo.existsByPlayerNameIgnoreCase(value)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "player name already exists");
        }
        return repo.save(applyTo(e, value));
    }

    // Pure shape validation shared by single POST and bulk (no DB touch).
    public static List<String> validate(String raw) {
        String value = raw == null ? "" : raw.trim();
        if (value.length() < 3) {
            return List.of("player name must be at least 3 characters");
        }
        return List.of();
    }

    // Bulk import (SPECV2 §2.1): dryRun=true previews without saving anything;
    // dryRun=false saves only valid rows. Rejects duplicates in DB and in batch.
    public List<BulkRowResult> bulk(List<PlayerNameBulkRow> rows, boolean dryRun) {
        return BulkHelper.run(rows, dryRun,
                r -> {
                    String value = r == null ? null : r.playerName();
                    List<String> errors = new ArrayList<>(validate(value));
                    if (errors.isEmpty() && repo.existsByPlayerNameIgnoreCase(value.trim())) {
                        errors.add("player name already exists");
                    }
                    return errors;
                },
                r -> r == null ? null : r.playerName(),
                r -> applyTo(new PlayerName(), r.playerName()),
                e -> repo.save(e).getId());
    }

    private static PlayerName applyTo(PlayerName e, String raw) {
        e.setPlayerName(raw.trim());
        return e;
    }

    public void delete(Long id) {
        if (!repo.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "not found");
        }
        repo.deleteById(id);
    }
}
