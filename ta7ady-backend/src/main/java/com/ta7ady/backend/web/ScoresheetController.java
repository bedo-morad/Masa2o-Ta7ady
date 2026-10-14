package com.ta7ady.backend.web;

import com.ta7ady.backend.entity.ScoresheetMatch;
import com.ta7ady.backend.service.ScoresheetService;
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
@RequestMapping("/api/scoresheet")
@RequiredArgsConstructor
public class ScoresheetController {
    private final ScoresheetService service;
    private final AdminGate admin;

    // GET /api/scoresheet?count=1 -> N random matches with both lineups
    @GetMapping
    public List<ScoresheetMatch> random(@RequestParam(defaultValue = "1") int count) {
        return service.random(count);
    }

    @GetMapping("/all")
    public Page<ScoresheetMatch> all(Pageable pageable) {
        return service.all(pageable);
    }

    // POST JSON: { "match": "...", "teamA": "...", "teamB": "...",
    //              "lineupA": [... x11], "lineupB": [... x11] }
    @PostMapping
    public ScoresheetMatch create(@RequestBody Map<String, Object> body) {
        return service.create(ScoresheetService.matchOf(body), str(body.get("teamA")), str(body.get("teamB")),
                list(body.get("lineupA")), list(body.get("lineupB")));
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

    private static List<?> list(Object raw) {
        return raw instanceof List ? (List<?>) raw : null;
    }
}
