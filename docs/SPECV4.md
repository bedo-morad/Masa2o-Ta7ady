# SPECV4.md — Ana Meen + Who-in-Picture + seeds

Target branch: `v4` (branched from `master` after v3 merges) → one big PR via small focused
commits (one per numbered section). Requires v3 merged (edit, importer, attribution).
Terms: `CONTEXT.md`. Rules: `RULES.md`. Authoring: `AUTHORING.md`.
Picture upload stays a post-v4 future; v4 hotlinks photos (see §4.3).

## 4.0 Build order

1. Ana Meen backend (§4.1) — 2. Ana Meen page (§4.2) — 3. Who-in-Picture backend (§4.3) —
   4. Who-in-Picture page (§4.4) — 5. Seeds (§4.5) — 6. Picked draws (§4.7, ID first then search).

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
- Picked draws acceptance, see §4.7.

## 4.7 Picked draws — pick-by-ID (Phase 1) + search-to-pick (Phase 2)

Optional opt-in on top of random, which stays the default. Bank is excluded entirely
(stays fully random, no `?ids=`, no picker). Covers every other pool: player names
(Password + Acting shared), Ihbid, Offside, Top-10, Score-sheet, Risk packs, Ana Meen,
Who-in-Picture.

### 4.7.1 Backend (Phase 1)

- `GET /api/{pool}?ids=1,2,3` (comma-separated) on all covered pools. Present `ids`
  wins over `?count=`; absent/empty `ids` = today's random path unchanged.
- Response order = request order. Unknown IDs are skipped with a `missing: [...]`
  note, never a whole-draw 404. Empty entries ignored.
- Max picked size reuses each pool's existing count clamp (e.g. scoresheet 1–10,
  whopicture 1–5, top10 1–50). No changes to `/all` or POST schemas.
- Risk: pack IDs only — inner tier questions are never individually pickable.

### 4.7.2 Play-page UI (Phase 1)

- Each covered play page keeps its existing random-count dropdown untouched and gains
  a separate same-styled Pick dropdown ("how many picked questions") → N text boxes,
  one ID per box. N boxes = N questions for one run/round/board.
- Per-run meaning: Password/Acting/Ihbid/Offside N = run size; Top-10/Scoresheet/
  AnaMeen/Who-picture N = lists/matches/subjects/photos in this run; Risk N = packs
  per board (caller uses 4); Bank has no picker (one 12-question round stays random).
- Starting from Pick plays exactly the filled boxes in box order; empty boxes are
  ignored (5 boxes + 3 filled = play those 3). Starting from Random ignores boxes.
  Mode switch never auto-clears. Picked runs keep the same redraw/dice semantics as
  random (redraw = new random unless still in Pick mode; dice on a picked row
  re-rolls random).
- Validation: per-box inline error (non-numeric / duplicate across boxes / not found);
  Start blocked while any filled box is invalid.

### 4.7.3 ID surfacing (Phase 1)

- `/manage` shows a copyable `#id` per row in all pools; create/edit confirmation
  states the ID explicitly (e.g. "saved as #42").
- Play views show a small referee-only `#id` tag per card/row so a random draw can be
  replayed later by ID.

### 4.7.4 Search-to-pick (Phase 2, after Phase 1 works)

- Same N-box UI — search fills boxes, it does not replace them. One shared search
  fills the first empty box (or per-box search icon, same effect); typed IDs keep
  working exactly as in Phase 1.
- Substring match on each pool's display field(s) via paged
  `GET /api/{pool}/search?q=`. No fuzzy ranking in v4.

### 4.7.5 Tests & acceptance (Phase 1 gates Phase 2)

- Backend: `ids` wins over `count`, order = request order, `missing` list, max-size
  clamp per pool, Bank has no `ids` path.
- Frontend: N boxes from Pick dropdown, invalid-blocks-start, `#id` visible in
  `/manage` + create-toast + play views, random default untouched.
- Acceptance: replay a just-added question by its ID with friends; picked run with
  one bad box blocked, then fixed and played.
