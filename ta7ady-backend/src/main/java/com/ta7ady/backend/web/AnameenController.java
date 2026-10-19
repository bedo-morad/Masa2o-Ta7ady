package com.ta7ady.backend.web;
import com.ta7ady.backend.dto.AnameenBulkRow;
import com.ta7ady.backend.bulk.BulkHelper;
import com.ta7ady.backend.bulk.BulkRowResult;

import com.ta7ady.backend.entity.AnameenSubject;
import com.ta7ady.backend.service.AnameenService;
import java.util.List;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
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
@RequiredArgsConstructor
@RequestMapping("/api/anameen")
public class AnameenController extends BulkAdminController<AnameenBulkRow, AnameenSubject> {
    private final AnameenService service;

    @Getter(AccessLevel.PROTECTED)
    private final AdminGate admin;

    // GET /api/anameen?count=3 -> N random subjects with all 5 clues, hard first.
    @GetMapping
    public ResponseEntity<List<AnameenSubject>> random(@RequestParam(defaultValue = "3") int count) {
        return ResponseEntity.ok(service.random(count));
    }

    @GetMapping("/all")
    public ResponseEntity<Page<AnameenSubject>> all(Pageable pageable) {
        return ResponseEntity.ok(service.all(pageable));
    }

    // POST JSON: { "player": "...", "clues": ["hard", ..., "easy"] }
    // Typed DTO like WhoPictureController's single-add: the schema is
    // type-checked at deserialization (409-free, BulkHelper untouched).
    @PostMapping
    public ResponseEntity<AnameenSubject> create(@RequestBody AnameenBulkRow body) {
        return ResponseEntity.ok(service.create(body.player(), body.clues()));
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
