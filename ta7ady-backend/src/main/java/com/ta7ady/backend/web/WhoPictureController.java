package com.ta7ady.backend.web;

import com.ta7ady.backend.entity.WhoPicturePhoto;
import com.ta7ady.backend.service.WhoPictureService;
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
@RequestMapping("/api/whopicture")
public class WhoPictureController extends BulkAdminController<WhoPictureBulkRow> {
    private final WhoPictureService service;

    public WhoPictureController(WhoPictureService service, AdminGate admin) {
        super(admin);
        this.service = service;
    }

    // GET /api/whopicture?count=X -> N random photos; one is a full game, so
    // default 1 clamps 1–5 (SPECV4 §4.3).
    @GetMapping
    public List<WhoPicturePhoto> random(@RequestParam(defaultValue = "1") int count) {
        return service.random(count);
    }

    @GetMapping("/all")
    public Page<WhoPicturePhoto> all(Pageable pageable) {
        return service.all(pageable);
    }

    // POST JSON: { "photoUrl": "https://...", "players": ["...", x11] }
    @PostMapping
    public WhoPicturePhoto create(@RequestBody WhoPictureBulkRow body) {
        return service.create(body.photoUrl(), body.players());
    }

    @Override
    protected List<BulkRowResult> bulkRows(List<WhoPictureBulkRow> rows, boolean dryRun) {
        return service.bulk(rows, dryRun);
    }

    @Override
    protected WhoPicturePhoto updateRow(Long id, WhoPictureBulkRow body) {
        return service.update(id, body.photoUrl(), body.players());
    }

    @Override
    protected void deleteRow(Long id) {
        service.delete(id);
    }
}
