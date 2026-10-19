package com.ta7ady.backend.web;
import com.ta7ady.backend.dto.BankBulkRow;
import com.ta7ady.backend.bulk.BulkRowResult;

import com.ta7ady.backend.entity.BankQuestion;
import com.ta7ady.backend.service.BankService;
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
@RequestMapping("/api/bank")
public class BankController extends BulkAdminController<BankBulkRow, BankQuestion> {
    private final BankService service;

    @Getter(AccessLevel.PROTECTED)
    private final AdminGate admin;

    // GET /api/bank?count=12 -> N random questions (the game draws ?count=72 once)
    @GetMapping
    public ResponseEntity<List<BankQuestion>> random(@RequestParam(defaultValue = "12") int count) {
        return ResponseEntity.ok(service.random(count));
    }

    @GetMapping("/all")
    public ResponseEntity<Page<BankQuestion>> all(Pageable pageable) {
        return ResponseEntity.ok(service.all(pageable));
    }

    // POST JSON: { "question": "...", "answer": "..." }
    @PostMapping
    public ResponseEntity<BankQuestion> create(@RequestBody BankBulkRow body) {
        return ResponseEntity.ok(service.create(body.question(), body.answer()));
    }

    @Override
    protected List<BulkRowResult> bulkRows(List<BankBulkRow> rows, boolean dryRun) {
        return service.bulk(rows, dryRun);
    }

    @Override
    protected BankQuestion updateRow(Long id, BankBulkRow body) {
        return service.update(id, body.question(), body.answer());
    }

    @Override
    protected void deleteRow(Long id) {
        service.delete(id);
    }
}
