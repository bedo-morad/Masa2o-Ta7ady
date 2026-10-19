package com.ta7ady.backend.web;
import com.ta7ady.backend.dto.Top10BulkRow;
import com.ta7ady.backend.bulk.BulkRowResult;

import com.ta7ady.backend.entity.Top10List;
import com.ta7ady.backend.service.Top10Service;
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
@RequestMapping("/api/top10")
public class Top10Controller extends BulkAdminController<Top10BulkRow, Top10List> {
    private final Top10Service service;

    @Getter(AccessLevel.PROTECTED)
    private final AdminGate admin;

    // GET /api/top10?count=1 -> N random lists with all 13 answers
    @GetMapping
    public ResponseEntity<List<Top10List>> random(@RequestParam(defaultValue = "1") int count) {
        return ResponseEntity.ok(service.random(count));
    }

    @GetMapping("/all")
    public ResponseEntity<Page<Top10List>> all(Pageable pageable) {
        return ResponseEntity.ok(service.all(pageable));
    }

    // POST JSON: { "prompt": "...", "answers": ["rank1", ..., "rank13"] }
    @PostMapping
    public ResponseEntity<Top10List> create(@RequestBody Map<String, Object> body) {
        var request = Top10SingleAddRequestParser.parse(body);
        return ResponseEntity.ok(service.create(request.prompt(), request.answers()));
    }

    @Override
    protected List<BulkRowResult> bulkRows(List<Top10BulkRow> rows, boolean dryRun) {
        return service.bulk(rows, dryRun);
    }

    @Override
    protected Top10List updateRow(Long id, Top10BulkRow body) {
        return service.update(id, body.prompt(), body.answers());
    }

    @Override
    protected void deleteRow(Long id) {
        service.delete(id);
    }
}
