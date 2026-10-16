package com.ta7ady.backend.web;

import com.ta7ady.backend.entity.BankQuestion;
import com.ta7ady.backend.service.BankService;
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
@RequestMapping("/api/bank")
public class BankController extends BulkAdminController<BankBulkRow> {
    private final BankService service;

    public BankController(BankService service, AdminGate admin) {
        super(admin);
        this.service = service;
    }

    // GET /api/bank?count=12 -> N random questions (the game draws ?count=72 once)
    @GetMapping
    public List<BankQuestion> random(@RequestParam(defaultValue = "12") int count) {
        return service.random(count);
    }

    @GetMapping("/all")
    public Page<BankQuestion> all(Pageable pageable) {
        return service.all(pageable);
    }

    // POST JSON: { "question": "...", "answer": "..." }
    @PostMapping
    public BankQuestion create(@RequestBody BankBulkRow body) {
        return service.create(body.question(), body.answer());
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
