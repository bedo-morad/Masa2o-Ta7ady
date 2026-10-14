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
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/offside")
@RequiredArgsConstructor
public class OffsideController {
    private final OffsideService service;
    private final AdminGate admin;

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

    // POST JSON array for bulk import; dryRun=true previews without saving.
    @PostMapping("/bulk")
    public List<BulkRowResult> bulk(@RequestBody List<Map<String, Object>> body,
            @RequestParam(defaultValue = "true") boolean dryRun) {
        return service.bulk(body, dryRun);
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id,
            @RequestHeader(value = "X-Admin-Password", required = false) String adminPassword) {
        admin.requireAdmin(adminPassword);
        service.delete(id);
    }
}
