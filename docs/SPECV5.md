# SPECV5.md — Dedup attack + Picked draws

Target branch: `v5` (branched from `master` after v4 merges) → one big PR via small focused
commits. Requires v4 merged (anameen, whopicture, shared attribution + strike-tracker).
Terms: `CONTEXT.md`. Rules: `RULES.md`. Authoring: `AUTHORING.md`. Standards: `CODE_STANDARDS.md`.

## 5.0 Build order

0. Full-scale dedup + maintainability attack (§5.1) — 1. Picked-draws backend Phase 1 (§5.2) —
   2. Play-page UI Phase 1 (§5.3) — 3. ID surfacing Phase 1 (§5.4) —
   4. Search-to-pick Phase 2 (§5.5) — 5. Tests & acceptance (§5.6).

Phase 1 gates Phase 2. Random stays the default throughout.

## 5.1 Prep: full-scale attack on duplicate + unmaintainable code (runs first)

V4 introduces `shared/attribution` + `shared/strike-tracker` and migrates Top-10 +
Score-sheet minimally. V5 finishes the job before adding picked draws:

- Inventory duplicates: attribution, strike/mistake counters, audit strips, bulk/preview,
  page/del wrappers, timer/scoreboard wiring, Google-search icons, count selectors,
  redraw/dice semantics. Each duplicate becomes one shared component/service or it is
  deleted — no second copy stays.
- Split unreadable files: any component/service/template over ~200 lines gets split
  (child components, pure helpers, pipes) until each file has one job and reads top-down.
  No logic in templates beyond `*if/*for` + bindings; no `any`, no `Map<String,Object>`
  casts (use DTO records/interfaces like v3 bulk rows).
- Migrate all old pages to the V4 shared components (Top-10 + Score-sheet fully, then
  every other page that re-implements attribution/strikes/audit/count/timer wiring).
- Keep behaviour identical: existing backend/frontend tests stay green; add specs for
  every extracted shared component (attribution math, strike thresholds, audit entries).
- Gates: `ng build` green, detector clean, `CODE_STANDARDS.md` clean. Land prep as its
  own commit(s) before any `?ids=` work so regressions bisect to prep vs feature.

## 5.2 Picked draws backend (Phase 1) — moved verbatim from V4 §4.7.1

Optional opt-in on top of random, which stays the default. Bank is excluded entirely
(stays fully random, no `?ids=`, no picker). Covers every other pool: player names
(Password + Acting shared), Ihbid, Offside, Top-10, Score-sheet, Risk packs, Ana Meen,
Who-in-Picture.

- `GET /api/{pool}?ids=1,2,3` (comma-separated) on all covered pools. Present `ids`
  wins over `?count=`; absent/empty `ids` = today's random path unchanged.
- Response order = request order. Unknown IDs are skipped with a `missing: [...]`
  note, never a whole-draw 404. Empty entries ignored.
- Max picked size reuses each pool's existing count clamp (e.g. scoresheet 1–10,
  whopicture 1–5, top10 1–50). No changes to `/all` or POST schemas.
- Risk: pack IDs only — inner tier questions are never individually pickable.

## 5.3 Play-page UI (Phase 1) — moved verbatim from V4 §4.7.2

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

## 5.4 ID surfacing (Phase 1) — moved verbatim from V4 §4.7.3

- `/manage` shows a copyable `#id` per row in all pools; create/edit confirmation
  states the ID explicitly (e.g. "saved as #42").
- Play views show a small referee-only `#id` tag per card/row so a random draw can be
  replayed later by ID.

## 5.5 Search-to-pick (Phase 2, after Phase 1 works) — moved verbatim from V4 §4.7.4

- Same N-box UI — search fills boxes, it does not replace them. One shared search
  fills the first empty box (or per-box search icon, same effect); typed IDs keep
  working exactly as in Phase 1.
- Substring match on each pool's display field(s) via paged
  `GET /api/{pool}/search?q=`. No fuzzy ranking in v5.

## 5.6 Tests & acceptance (Phase 1 gates Phase 2) — moved verbatim from V4 §4.7.5

- Backend: `ids` wins over `count`, order = request order, `missing` list, max-size
  clamp per pool, Bank has no `ids` path.
- Frontend: N boxes from Pick dropdown, invalid-blocks-start, `#id` visible in
  `/manage` + create-toast + play views, random default untouched.
- Acceptance: replay a just-added question by its ID with friends; picked run with
  one bad box blocked, then fixed and played.
