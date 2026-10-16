# SPECV4.md — Ana Meen + Who-in-Picture + seeds (V4 scope, §4.7 moved to V5)

Target branch: `v4` (branched from `master` after v3 merges) → one big PR via small focused
commits. Requires v3 merged (edit, importer, attribution).
Terms: `CONTEXT.md`. Rules: `RULES.md`. Authoring: `AUTHORING.md`. Standards: `CODE_STANDARDS.md`.
Picture upload stays a post-v4 future; v4 hotlinks photos (see §4.3).
Picked draws (§4.7 in older draft) moved verbatim to `SPECV5.md` — not in V4.

## 4.0 Build order

1. Spec/V5/standards prep (this commit) — 2. Shared components
   (`shared/strike-tracker`, `shared/attribution`, extracted from Score-sheet + Top-10) —
   3. Ana Meen backend (§4.1) — 4. Ana Meen page (§4.2) —
   5. Who-in-Picture backend (§4.3) — 6. Who-in-Picture page (§4.4) — 7. Seeds (§4.5).
   Backend → page per pool; pages reuse shared components, no copied logic.

## 4.1 Ana Meen backend

- Table `anameen_subjects(id, player, clues[5 ordered hard→easy], created_at)`.
  POST enforces exactly 5 distinct non-empty clues.
- `GET /api/anameen?count=X` (default 3, clamp 1–10), `/all` paged, POST, admin-gated
  DELETE, edit support per v3 §3.1.

## 4.2 Ana Meen page (`/anameen`)

- Subjects per challenge adjustable 1 / 3 / 5 / 10 (default 3), teams alternating.
- One subject at a time: clue 1 shown with the 60s timer (`anameen` settings key); on timeout or referee tap,
  next clue reveals (progressively easier). Referee reveals clues, judges the guess.
- Correct guess → shared `attribution` component (+1 flat, any clue, §2.3 pattern). No clue-number scoring.
- Same chrome: scoreboard, 60s timer, full redraw + per-subject dice reroll.
- `$frontend-design` applies (distinctive, one signature element, quiet chrome).

## 4.3 Who-in-Picture backend

- Table `whopicture_photos(id, photo_url, players[11], created_at)`. POST enforces exactly
  11 distinct names and a non-empty URL. Hotlinking only in v4 — no upload endpoint, no
  storage (upload UI is a post-v4 future, not this spec).
- `GET /api/whopicture?count=X` (default 1 — one photo is a full game; clamp 1–5),
  `/all` paged, POST, admin-gated DELETE, edit support.

## 4.4 Who-in-Picture page (`/whopicture`)

- Referee screen: the photo (answers-adjacent, never shared raw) + 11 name slots covered
  until attributed + shared `attribution` component per name (+1 fixed each, tap again
  unassigns + reverses + audit entry, §2.3 pattern) + shared `strike-tracker` per player.
- The room must see the photo without the answers: a **share button** opens the native
  share sheet with the photo URL (fallback: copy link). No second-screen mode in v4.
- Player tracking: referee enters 4 player names at game start (2 per team, editable
  defaults from settings prefill). Each player carries a shared `strike-tracker`
  (increment / decrement / reset buttons, referee-owned); `eliminationThreshold = 2`
  here (vs 3 in Score-sheet). At threshold the slot shows eliminated (display-only —
  the referee enforces, the teammate continues).
- Same chrome otherwise: scoreboard, 10s timer visible by default (`whopicture`
  settings key, beep-only on timeout, no auto-penalty), new-photo redraw.
- Audit strip from §2.3 covers attribution disputes; mistake counters are display-only
  and excluded from it.
- `$frontend-design` applies (distinctive, one signature element, quiet chrome).
- Reuse rule: extract `strike-tracker` from Score-sheet and `attribution` from Top-10
  into `shared/` with inputs (`eliminationThreshold`, points value/mode); minimally
  refactor those two old pages to use the shared components. No other old-page edits.

## 4.5 v4 seeds (files only — owner imports)

`anameen.json` 100 subjects + `whopicture.json` 75 photos, per `AUTHORING.md`
(5 ordered clues; 11 pictured names; widely-mirrored photo URLs against link rot).
Same bar as Bank/Risk: 60/30/10 era mix, ~25% Egypt-local spread across bands,
verifier clean (schema + lengths ≥3 + NFC/diacritic dedupe + mix report).
Delivery: 25% sample first for review, then remaining 75% after approval.
Committed importer-ready via the v2 importer schema; dry-run reviewed but NOT
imported by agents — owner imports manually.

## 4.6 Tests & acceptance

- Backend: 5-clue enforcement, 11-name enforcement, URL presence, count defaults/clamps,
  admin gating on edit/delete, `/manage` parity (bulk + paged `/all` + PUT/DELETE).
- Frontend: clue progression + 60s cadence; shared attribution +1 and unassign + audit;
  shared strike-tracker incl. the 2-strike eliminated flag (and 3-strike still green in
  Score-sheet); share-button fallback path (no native share API); 10s whopicture timer.
- `ng build` green, detector clean, `CODE_STANDARDS.md` followed (no duplicated
  attribution/strike logic).
- Acceptance: full 3-subject Ana Meen game incl. a clue-5 solve still scoring 1; full
  11-player photo game incl. a 2-consecutive-strike elimination and a shared photo;
  edit a row in both pools.
