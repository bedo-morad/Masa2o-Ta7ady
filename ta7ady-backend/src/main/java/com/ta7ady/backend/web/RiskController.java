package com.ta7ady.backend.web;

import com.ta7ady.backend.entity.RiskPack;
import com.ta7ady.backend.service.RiskService;
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
@RequestMapping("/api/risk")
public class RiskController extends BulkAdminController<RiskBulkRow> {
    private final RiskService service;

    public RiskController(RiskService service, AdminGate admin) {
        super(admin);
        this.service = service;
    }

    // GET /api/risk?count=4 -> N random packs (one board = 4 packs = 16 questions)
    @GetMapping
    public List<RiskPack> random(@RequestParam(defaultValue = "4") int count) {
        return service.random(count);
    }

    @GetMapping("/all")
    public Page<RiskPack> all(Pageable pageable) {
        return service.all(pageable);
    }

    // POST JSON: { "genre": "...", "questions": [{ "points": 5, "question": "...", "answer": "..." } x4] }
    @PostMapping
    public RiskPack create(@RequestBody RiskBulkRow body) {
        return service.create(body.genre(), body.questions());
    }

    @Override
    protected List<BulkRowResult> bulkRows(List<RiskBulkRow> rows, boolean dryRun) {
        return service.bulk(rows, dryRun);
    }

    @Override
    protected RiskPack updateRow(Long id, RiskBulkRow body) {
        return service.update(id, body.genre(), body.questions());
    }

    @Override
    protected void deleteRow(Long id) {
        service.delete(id);
    }
}
