package com.ta7ady.backend.service;

import com.ta7ady.backend.entity.OffsideRule;
import com.ta7ady.backend.repository.OffsideRuleRepository;
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
        String value = raw == null ? "" : raw.trim();
        if (value.length() < 3) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "rule must be at least 3 characters");
        }
        OffsideRule e = new OffsideRule();
        e.setRuleText(value);
        return repo.save(e);
    }

    public void delete(Long id) {
        if (!repo.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "not found");
        }
        repo.deleteById(id);
    }
}
