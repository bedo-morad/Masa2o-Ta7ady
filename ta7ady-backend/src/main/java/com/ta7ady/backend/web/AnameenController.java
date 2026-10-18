package com.ta7ady.backend.web;
import com.ta7ady.backend.dto.AnameenBulkRow;
import com.ta7ady.backend.bulk.BulkHelper;
import com.ta7ady.backend.bulk.BulkRowResult;

import com.ta7ady.backend.entity.AnameenSubject;
import com.ta7ady.backend.service.AnameenService;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/anameen")
public class AnameenController extends BulkAdminController<AnameenBulkRow> {
    private final AnameenService service;

    public AnameenController(AnameenService service, AdminGate admin) {
        super(admin);
        this.service = service;
    }

    // GET /api/anameen?count=3 -> N random subjects with all 5 clues, hard first.
    @GetMapping
    public List<AnameenSubject> random(@RequestParam(defaultValue = "3") int count) {
        return service.random(count);
    }

    @GetMapping("/all")
    public Page<AnameenSubject> all(Pageable pageable) {
        return service.all(pageable);
    }

    // POST JSON: { "player": "...", "clues": ["hard", ..., "easy"] }
    // Typed DTO like WhoPictureController's single-add: the schema is
    // type-checked at deserialization (409-free, BulkHelper untouched).
    @PostMapping
    public AnameenSubject create(@RequestBody AnameenBulkRow body) {
        return service.create(body.player(), body.clues());
    }

    @Override
    protected List<BulkRowResult> bulkRows(List<AnameenBulkRow> rows, boolean dryRun) {
        return service.bulk(rows, dryRun);
    }

    @Override
    protected AnameenSubject updateRow(Long id, AnameenBulkRow body) {
        return service.update(id, body.player(), body.clues());
    }

    @Override
    protected void deleteRow(Long id) {
        service.delete(id);
    }
}
