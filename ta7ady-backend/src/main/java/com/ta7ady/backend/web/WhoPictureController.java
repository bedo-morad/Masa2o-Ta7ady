package com.ta7ady.backend.web;
import com.ta7ady.backend.dto.WhoPictureBulkRow;
import com.ta7ady.backend.bulk.BulkRowResult;

import com.ta7ady.backend.entity.WhoPicturePhoto;
import com.ta7ady.backend.service.WhoPictureService;
import java.util.List;
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
@RequestMapping("/api/whopicture")
public class WhoPictureController extends BulkAdminController<WhoPictureBulkRow, WhoPicturePhoto> {
    private final WhoPictureService service;

    public WhoPictureController(WhoPictureService service, AdminGate admin) {
        super(admin);
        this.service = service;
    }

    // GET /api/whopicture?count=X -> N random photos; one is a full game, so
    // default 1 clamps 1–5 (SPECV4 §4.3).
    @GetMapping
    public ResponseEntity<List<WhoPicturePhoto>> random(@RequestParam(defaultValue = "1") int count) {
        return ResponseEntity.ok(service.random(count));
    }

    @GetMapping("/all")
    public ResponseEntity<Page<WhoPicturePhoto>> all(Pageable pageable) {
        return ResponseEntity.ok(service.all(pageable));
    }

    // POST JSON: { "title": "...", "photoUrl": "https://...", "players": ["...", x11] }
    @PostMapping
    public ResponseEntity<WhoPicturePhoto> create(@RequestBody WhoPictureBulkRow body) {
        return ResponseEntity.ok(service.create(body.title(), body.photoUrl(), body.players()));
    }

    @Override
    protected List<BulkRowResult> bulkRows(List<WhoPictureBulkRow> rows, boolean dryRun) {
        return service.bulk(rows, dryRun);
    }

    @Override
    protected WhoPicturePhoto updateRow(Long id, WhoPictureBulkRow body) {
        return service.update(id, body.title(), body.photoUrl(), body.players());
    }

    @Override
    protected void deleteRow(Long id) {
        service.delete(id);
    }
}
