package com.ta7ady.backend.web;
import com.ta7ady.backend.dto.ScoresheetBulkRow;
import com.ta7ady.backend.bulk.BulkHelper;
import com.ta7ady.backend.bulk.BulkRowResult;

import com.ta7ady.backend.entity.ScoresheetMatch;
import com.ta7ady.backend.service.ScoresheetService;
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
@RequestMapping("/api/scoresheet")
public class ScoresheetController extends BulkAdminController<ScoresheetBulkRow> {
    private final ScoresheetService service;

    public ScoresheetController(ScoresheetService service, AdminGate admin) {
        super(admin);
        this.service = service;
    }

    // GET /api/scoresheet?count=1 -> N random matches with both lineups
    @GetMapping
    public List<ScoresheetMatch> random(@RequestParam(defaultValue = "1") int count) {
        return service.random(count);
    }

    @GetMapping("/all")
    public Page<ScoresheetMatch> all(Pageable pageable) {
        return service.all(pageable);
    }

    // POST JSON: { "match": "...", "teamA": "...", "teamB": "...",
    //              "lineupA": [... x11], "lineupB": [... x11] }
    @PostMapping
    public ScoresheetMatch create(@RequestBody Map<String, Object> body) {
        return service.create(ScoresheetService.matchOf(body), BulkHelper.str(body.get("teamA")),
                BulkHelper.str(body.get("teamB")), BulkHelper.list(body.get("lineupA")),
                BulkHelper.list(body.get("lineupB")));
    }

    @Override
    protected List<BulkRowResult> bulkRows(List<ScoresheetBulkRow> rows, boolean dryRun) {
        return service.bulk(rows, dryRun);
    }

    @Override
    protected ScoresheetMatch updateRow(Long id, ScoresheetBulkRow body) {
        return service.update(id, body.match(), body.teamA(), body.teamB(), body.lineupA(), body.lineupB());
    }

    @Override
    protected void deleteRow(Long id) {
        service.delete(id);
    }
}
