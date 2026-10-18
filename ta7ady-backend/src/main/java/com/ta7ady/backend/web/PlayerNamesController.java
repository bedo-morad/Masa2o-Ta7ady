package com.ta7ady.backend.web;
import com.ta7ady.backend.dto.PlayerNameBulkRow;
import com.ta7ady.backend.bulk.BulkRowResult;

import com.ta7ady.backend.entity.PlayerName;
import com.ta7ady.backend.service.PlayerNameService;
import java.util.List;
import java.util.Map;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

// Single merged pool: one table/service/controller, three URL aliases.
// Canonical: /api/players. Aliases /api/password and /api/acting serve the
// same rows so both frontend screens stay separate while backend stays merged.
@RestController
@RequestMapping({"/api/players", "/api/password", "/api/acting"})
public class PlayerNamesController extends BulkAdminController<PlayerNameBulkRow, PlayerName> {
    private final PlayerNameService service;

    public PlayerNamesController(PlayerNameService service, AdminGate admin) {
        super(admin);
        this.service = service;
    }

    // GET /api/players?count=10 -> N random rows as JSON (same for /api/password, /api/acting)
    @GetMapping
    public ResponseEntity<List<PlayerName>> random(@RequestParam(defaultValue = "10") int count) {
        return ResponseEntity.ok(service.random(count));
    }

    @GetMapping("/all")
    public ResponseEntity<Page<PlayerName>> all(Pageable pageable) {
        return ResponseEntity.ok(service.all(pageable));
    }

    // POST JSON: { "playerName": "..." }
    @PostMapping
    public ResponseEntity<PlayerName> create(@RequestBody Map<String, String> body) {
        return ResponseEntity.ok(service.create(body.getOrDefault("playerName", "")));
    }

    @Override
    protected List<BulkRowResult> bulkRows(List<PlayerNameBulkRow> rows, boolean dryRun) {
        return service.bulk(rows, dryRun);
    }

    @Override
    protected PlayerName updateRow(Long id, PlayerNameBulkRow body) {
        return service.update(id, body.playerName());
    }

    @Override
    protected void deleteRow(Long id) {
        service.delete(id);
    }
}
