package com.ta7ady.backend.web;

import com.ta7ady.backend.entity.Top10List;
import com.ta7ady.backend.service.Top10Service;
import java.util.List;
import java.util.Map;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/top10")
public class Top10Controller extends BulkAdminController<Top10BulkRow> {
    private final Top10Service service;

    public Top10Controller(Top10Service service, AdminGate admin) {
        super(admin);
        this.service = service;
    }

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
        return service.create(BulkHelper.str(body.get("prompt")),
                answers instanceof List ? (List<?>) answers : null);
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
