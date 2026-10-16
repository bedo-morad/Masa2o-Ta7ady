package com.ta7ady.backend.service;

import com.ta7ady.backend.entity.WhoPicturePhoto;
import com.ta7ady.backend.repository.WhoPicturePhotoRepository;
import com.ta7ady.backend.web.BulkHelper;
import com.ta7ady.backend.web.BulkRowResult;
import com.ta7ady.backend.web.WhoPictureBulkRow;
import java.net.URI;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class WhoPictureService {
    // One photo is a full game; the page may draw a couple of spares (SPECV4 §4.3).
    static final int MAX_COUNT = 5;

    // Exactly the 11 pictured names, any order (AUTHORING.md §3.9).
    static final int PLAYER_COUNT = 11;

    private final WhoPicturePhotoRepository repo;

    public List<WhoPicturePhoto> random(int count) {
        return repo.findRandom(normalizeCount(count));
    }

    static int normalizeCount(int count) {
        if (count < 1) return 1;
        if (count > MAX_COUNT) return MAX_COUNT;
        return count;
    }

    public Page<WhoPicturePhoto> all(Pageable pageable) {
        return repo.findAll(pageable);
    }

    public WhoPicturePhoto create(String photoUrl, List<String> players) {
        List<String> errors = validate(photoUrl, players);
        if (!errors.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, String.join("; ", errors));
        }
        return repo.save(toEntity(photoUrl, players));
    }

    // Admin-gated edit (SPECV3 §3.1): same validation as create, applied instantly.
    public WhoPicturePhoto update(Long id, String photoUrl, List<String> players) {
        WhoPicturePhoto e = repo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "not found"));
        List<String> errors = validate(photoUrl, players);
        if (!errors.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, String.join("; ", errors));
        }
        e.setPhotoUrl(photoUrl.trim());
        e.getPlayers().clear();
        e.getPlayers().addAll(cleaned(players));
        return repo.save(e);
    }

    // Pure validation shared by single POST, edit (PUT) and bulk (AUTHORING.md §3.9:
    // exactly 11 distinct names, each >= 3 chars; hotlink URL, no uploads in v4).
    public static List<String> validate(String photoUrl, List<?> players) {
        List<String> errors = new ArrayList<>();
        String url = photoUrl == null ? "" : photoUrl.trim();
        if (url.length() < 3) {
            errors.add("photoUrl must be at least 3 characters");
        } else if (!validHttpUrl(url)) {
            errors.add("photoUrl must be a valid http(s) URL");
        }
        errors.addAll(validatePlayers(players));
        return errors;
    }

    private static List<String> validatePlayers(List<?> players) {
        List<String> errors = new ArrayList<>();
        if (players == null || players.size() != PLAYER_COUNT) {
            errors.add("players must contain exactly 11 entries");
            return errors;
        }
        Set<String> seen = new HashSet<>();
        for (int i = 0; i < players.size(); i++) {
            Object raw = players.get(i);
            String name = raw == null ? "" : raw.toString().trim();
            if (name.length() < 3) {
                errors.add("players entry " + (i + 1) + " must be at least 3 characters");
            } else if (!seen.add(name.toLowerCase())) {
                errors.add("players entry " + (i + 1) + " is a duplicate");
            }
        }
        return errors;
    }

    // Hotlink shape check: an absolute http(s) URL with a host. URI.create throws on
    // spaces and most malformed input, which counts as invalid.
    static boolean validHttpUrl(String url) {
        try {
            URI uri = URI.create(url);
            String scheme = uri.getScheme();
            if (!"http".equalsIgnoreCase(scheme) && !"https".equalsIgnoreCase(scheme)) {
                return false;
            }
            String host = uri.getHost();
            return host != null && !host.isEmpty();
        } catch (IllegalArgumentException e) {
            return false;
        }
    }

    // Bulk import (SPECV2 §2.1, SPECV3 §3.0.1): shared mechanics in BulkHelper. A photo
    // repeated in the same batch is rejected; the signature is the URL plus every name,
    // so a different crop of the same URL is still a distinct row.
    public List<BulkRowResult> bulk(List<WhoPictureBulkRow> rows, boolean dryRun) {
        return BulkHelper.run(rows, dryRun,
                r -> validate(r == null ? null : r.photoUrl(), r == null ? null : r.players()),
                r -> signature(r == null ? null : r.photoUrl(), r == null ? null : r.players()),
                r -> toEntity(r.photoUrl(), r.players()),
                e -> repo.save(e).getId());
    }

    public void delete(Long id) {
        if (!repo.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "not found");
        }
        repo.deleteById(id);
    }

    // Identity of a photo: its URL plus every pictured name, case-insensitively.
    private static String signature(String photoUrl, List<?> players) {
        StringBuilder sb = new StringBuilder(photoUrl == null ? "" : photoUrl.trim().toLowerCase());
        if (players != null) {
            for (Object raw : players) {
                sb.append('\u0001');
                sb.append(raw == null ? "" : raw.toString().trim().toLowerCase());
            }
        }
        return sb.toString();
    }

    private static WhoPicturePhoto toEntity(String photoUrl, List<?> players) {
        WhoPicturePhoto e = new WhoPicturePhoto();
        e.setPhotoUrl(photoUrl.trim());
        e.setPlayers(cleaned(players));
        return e;
    }

    private static List<String> cleaned(List<?> players) {
        List<String> clean = new ArrayList<>();
        for (Object raw : players) {
            clean.add(raw == null ? "" : raw.toString().trim());
        }
        return clean;
    }
}
