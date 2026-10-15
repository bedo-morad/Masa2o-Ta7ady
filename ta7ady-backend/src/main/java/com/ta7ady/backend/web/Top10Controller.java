package com.ta7ady.backend.web;

import com.ta7ady.backend.entity.Top10List;
import com.ta7ady.backend.service.Top10Service;
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
@RequestMapping("/api/top10")
@RequiredArgsConstructor
public class Top10Controller {
    private final Top10Service service;
    private final AdminGate admin;

    // GET /api/top10?count=1 -> N random lists with all 13 answers
    @GetMapping
    public List<Top10List> random(@RequestParam(defaultValue = "1") int count) {
        return service.random(count);
    }

    @GetMapping("/all")
    public Page<Top10List> all(Pageable pageable) {
        return service.all(pageable);
    }

    // POST JSON: { "prompt": "...", "answers": ["rank1", ..., "rank13"] }
    @PostMapping
    public Top10List create(@RequestBody Map<String, Object> body) {
        Object answers = body.get("answers");
        return service.create(str(body.get("prompt")), answers instanceof List ? (List<?>) answers : null);
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

    private static String str(Object raw) {
        return raw == null ? null : raw.toString();
    }
}
