package com.ta7ady.backend.web;

import com.ta7ady.backend.entity.OffsideRule;
import com.ta7ady.backend.service.OffsideService;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/offside")
@RequiredArgsConstructor
public class OffsideController {
    private final OffsideService service;

    // GET /api/offside?count=10 -> N random rows as JSON
    @GetMapping
    public List<OffsideRule> random(@RequestParam(defaultValue = "10") int count) {
        return service.random(count);
    }

    @GetMapping("/all")
    public Page<OffsideRule> all(Pageable pageable) {
        return service.all(pageable);
    }

    // POST JSON: { "ruleText": "..." }
    @PostMapping
    public OffsideRule create(@RequestBody Map<String, String> body) {
        return service.create(body.getOrDefault("ruleText", ""));
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) {
        service.delete(id);
    }
}
