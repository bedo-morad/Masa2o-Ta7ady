package com.ta7ady.backend.service;

import com.ta7ady.backend.entity.PlayerName;
import com.ta7ady.backend.repository.PlayerNameRepository;
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
        String value = raw == null ? "" : raw.trim();
        if (value.length() < 3) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "player name must be at least 3 characters");
        }
        if (repo.existsByPlayerNameIgnoreCase(value)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "player name already exists");
        }
        PlayerName e = new PlayerName();
        e.setPlayerName(value);
        return repo.save(e);
    }

    public void delete(Long id) {
        if (!repo.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "not found");
        }
        repo.deleteById(id);
    }
}
