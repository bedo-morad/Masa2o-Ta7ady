# SPECV4.md — Ana Meen + Who-in-Picture + seeds

Target branch: `v4` (branched from `master` after v3 merges) → one big PR via small focused
commits (one per numbered section). Requires v3 merged (edit, importer, attribution).
Terms: `CONTEXT.md`. Rules: `RULES.md`. Authoring: `AUTHORING.md`.
Picture upload stays a post-v4 future; v4 hotlinks photos (see §4.3).

## 4.0 Build order

1. Ana Meen backend (§4.1) — 2. Ana Meen page (§4.2) — 3. Who-in-Picture backend (§4.3) —
   4. Who-in-Picture page (§4.4) — 5. Seeds (§4.5).

## 4.1 Ana Meen backend

- Table `anameen_subjects(id, player, clues[5 ordered hard→easy], created_at)`.
  POST enforces exactly 5 distinct non-empty clues.
- `GET /api/anameen?count=X` (default 3, clamp 1–10), `/all` paged, POST, admin-gated
  DELETE, edit support per v3 §3.1.

## 4.2 Ana Meen page (`/anameen`)

- Subjects per challenge adjustable 1 / 3 / 5 / 10 (default 3), teams alternating.
- One subject at a time: clue 1 shown with the 60s timer; on timeout or referee tap,
  next clue reveals (progressively easier). Referee reveals clues, judges the guess.
- Correct guess → attribute team (+1 flat, any clue, §2.3 pattern). No clue-number scoring.
- Same chrome: scoreboard, 60s timer, full redraw + per-subject dice reroll.

## 4.3 Who-in-Picture backend

- Table `whopicture_photos(id, photo_url, players[11], created_at)`. POST enforces exactly
  11 distinct names and a non-empty URL. Hotlinking only in v4 — no upload endpoint, no
  storage (upload UI is a post-v4 future, not this spec).
- `GET /api/whopicture?count=X` (default 1 — one photo is a full game; clamp 1–5),
  `/all` paged, POST, admin-gated DELETE, edit support.

## 4.4 Who-in-Picture page (`/whopicture`)

- Referee screen: the photo (answers-adjacent, never shared raw) + 11 name slots covered
  until attributed + per-team attribution by tap (+1 each, §2.3 pattern) + per-**player**
  mistake counters.
- The room must see the photo without the answers: a **share button** opens the native
  share sheet with the photo URL (fallback: copy link). No second-screen mode in v4.
- Player tracking: referee enters 4 player names at game start (2 per team, editable
  defaults provided). Each player carries a mistake counter (referee taps); at 3 the slot
  shows eliminated (display-only — the referee enforces, the teammate continues).
- Same chrome otherwise: scoreboard, no timer by default (guessing is open-ended;
  referee may still use a manual timer component if desired — optional, default hidden),
  new-photo redraw.
- Audit strip from §2.3 covers attribution disputes; mistake counters are display-only
  and excluded from it.

## 4.5 v4 seeds

`anameen.json` 100 subjects + `whopicture.json` 75 photos, per `AUTHORING.md`
(5 ordered clues; 11 pictured names; widely-mirrored photo URLs against link rot).
Imported via the v2 importer with dry-run review.

## 4.6 Tests & acceptance

- Backend: 5-clue enforcement, 11-name enforcement, URL presence, count defaults/clamps,
  admin gating on edit/delete.
- Frontend: clue progression + 60s cadence; attribution +1 and unassign; mistake counters
  incl. the 3-strike eliminated flag; share-button fallback path (no native share API).
- `ng build` green, detector clean.
- Acceptance: full 3-subject Ana Meen game incl. a clue-5 solve still scoring 1; full
  11-player photo game incl. an elimination and a shared photo; edit a row in both pools.
