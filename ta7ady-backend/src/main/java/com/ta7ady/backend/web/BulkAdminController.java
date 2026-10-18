package com.ta7ady.backend.web;
import com.ta7ady.backend.bulk.BulkRowResult;

import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestParam;

// Shared POST /bulk + admin-gated DELETE + admin-gated PUT endpoints (SPECV2
// §2.1–2.2, SPECV3 §3.0.1–3.1). Each pool controller binds its own path and
// bulk-row DTO (which is also the single-add/edit body) and supplies its
// service for the three operations.
public abstract class BulkAdminController<R, E> {
    private final AdminGate admin;

    protected BulkAdminController(AdminGate admin) {
        this.admin = admin;
    }

    protected abstract List<BulkRowResult> bulkRows(List<R> rows, boolean dryRun);

    protected abstract E updateRow(Long id, R body);

    protected abstract void deleteRow(Long id);

    // POST JSON array for bulk import; dryRun=true previews without saving.
    @PostMapping("/bulk")
    public ResponseEntity<List<BulkRowResult>> bulk(@RequestBody List<R> body,
            @RequestParam(defaultValue = "true") boolean dryRun) {
        return ResponseEntity.ok(bulkRows(body, dryRun));
    }

    // Admin-gated edit (SPECV3 §3.1): same validation as create, applied instantly.
    @PutMapping("/{id}")
    public ResponseEntity<E> update(@PathVariable Long id, @RequestBody R body,
            @RequestHeader(value = "X-Admin-Password", required = false) String adminPassword) {
        admin.requireAdmin(adminPassword);
        return ResponseEntity.ok(updateRow(id, body));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id,
            @RequestHeader(value = "X-Admin-Password", required = false) String adminPassword) {
        admin.requireAdmin(adminPassword);
        deleteRow(id);
        return ResponseEntity.ok().build();
    }
}
