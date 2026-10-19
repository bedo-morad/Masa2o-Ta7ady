package com.ta7ady.backend.web;
import com.ta7ady.backend.dto.IhbidBulkRow;
import com.ta7ady.backend.bulk.BulkRowResult;

import com.ta7ady.backend.entity.IhbidQuestion;
import com.ta7ady.backend.service.IhbidService;
import java.util.List;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
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
@RequiredArgsConstructor
@RequestMapping("/api/ihbid")
public class IhbidController extends BulkAdminController<IhbidBulkRow, IhbidQuestion> {
    private final IhbidService service;

    @Getter(AccessLevel.PROTECTED)
    private final AdminGate admin;

    // GET /api/ihbid?count=10 -> N random rows as JSON
    @GetMapping
    public ResponseEntity<List<IhbidQuestion>> random(@RequestParam(defaultValue = "10") int count) {
        return ResponseEntity.ok(service.random(count));
    }

    @GetMapping("/all")
    public ResponseEntity<Page<IhbidQuestion>> all(Pageable pageable) {
        return ResponseEntity.ok(service.all(pageable));
    }

    // POST JSON: { "questionText": "...", "answerText": "..." }
    @PostMapping
    public ResponseEntity<IhbidQuestion> create(@RequestBody Map<String, String> body) {
        return ResponseEntity.ok(service.create(body.getOrDefault("questionText", ""), body.getOrDefault("answerText", "")));
    }

    @Override
    protected List<BulkRowResult> bulkRows(List<IhbidBulkRow> rows, boolean dryRun) {
        return service.bulk(rows, dryRun);
    }

    @Override
    protected IhbidQuestion updateRow(Long id, IhbidBulkRow body) {
        return service.update(id, body.questionText(), body.answerText());
    }

    @Override
    protected void deleteRow(Long id) {
        service.delete(id);
    }
}
