package com.ta7ady.backend.web;
import com.ta7ady.backend.dto.OffsideBulkRow;
import com.ta7ady.backend.bulk.BulkRowResult;

import com.ta7ady.backend.entity.OffsideRule;
import com.ta7ady.backend.service.OffsideService;
import java.util.List;
import java.util.Map;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/offside")
public class OffsideController extends BulkAdminController<OffsideBulkRow, OffsideRule> {
    private final OffsideService service;

    public OffsideController(OffsideService service, AdminGate admin) {
        super(admin);
        this.service = service;
    }

    // GET /api/offside?count=10 -> N random rows as JSON
    @GetMapping
    public ResponseEntity<List<OffsideRule>> random(@RequestParam(defaultValue = "10") int count) {
        return ResponseEntity.ok(service.random(count));
    }

    @GetMapping("/all")
    public ResponseEntity<Page<OffsideRule>> all(Pageable pageable) {
        return ResponseEntity.ok(service.all(pageable));
    }

    // POST JSON: { "ruleText": "..." }
    @PostMapping
    public ResponseEntity<OffsideRule> create(@RequestBody Map<String, String> body) {
        return ResponseEntity.ok(service.create(body.getOrDefault("ruleText", "")));
    }

    @Override
    protected List<BulkRowResult> bulkRows(List<OffsideBulkRow> rows, boolean dryRun) {
        return service.bulk(rows, dryRun);
    }

    @Override
    protected OffsideRule updateRow(Long id, OffsideBulkRow body) {
        return service.update(id, body.ruleText());
    }

    @Override
    protected void deleteRow(Long id) {
        service.delete(id);
    }
}
