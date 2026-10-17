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

- Subjects per challenge adjustable 1 / 3 / 5 / 10 (default 3). No "pick who starts" —
  both teams guess the same subject simultaneously; the referee awards whoever solved first.
- All 5 clues visible on the subject card from the start (hard→easy top-down, no reveal
  button, no locked/hatched state — the referee reads clue 1 aloud and gives the next one
  when nobody solves; the display never gates him). The clue dossier IS the signature
  element but without the giant "؟" watermark. 60s timer per subject (`anameen` key,
  beep-only, no auto-anything). Full redraw + per-subject dice reroll.
- No Google-search icon on the player name (meaningless here).
- Correct guess → attribution inside a single card titled like «من خمّن صح؟» containing
  the two big team buttons (+1 flat, any clue, shared attribution component).
- Player name displayed centered, larger type, no «اللاعب:» prefix label.

## 4.3 Who-in-Picture backend

- Table `whopicture_photos(id, title, photo_url, players[11], created_at)`. POST enforces
  exactly 11 distinct names, a non-empty valid URL, and a non-empty title (≥3 chars).
  Title = club or nation + year + competition (+ stage for KO rounds: final / semi-final /
  quarter-final etc.), e.g. "الأهلي 2021 نهائي دوري أبطال أفريقيا". Hotlinking only in
  v4 — no upload endpoint, no storage (upload UI is a post-v4 future, not this spec).
- `GET /api/whopicture?count=X` (default 1 — one photo is a full game; clamp 1–5),
  `/all` paged, POST, admin-gated DELETE, edit support (title editable like every field).
- Clubs-over-nations is an authoring rule (see AUTHORING §3.9), not backend validation —
  titles carry the context either way.

## 4.4 Who-in-Picture page (`/whopicture`)

- Referee screen: the photo rendered always fully visible (`object-fit: contain`, never
  cropped) with a loading skeleton/state while it fetches from the external host, the
  title above it, and two share buttons: share the URL and share the image itself —
  both must attempt a real native share (navigator.share / files, not just copy; copy is
  only the last fallback).
- All 11 names visible uncovered from the start in ONE column (full name + full team
  name on the award buttons — never short أ/ب), shared `attribution` per name (+1 fixed
  each, tap again unassigns + reverses + audit entry, §2.3 pattern) + shared
  `strike-tracker` per player.
- Player tracking: referee enters 4 player names at game start (2 per team, editable
  defaults from settings prefill). Each player carries a shared `strike-tracker`
  (increment / decrement / reset buttons, referee-owned); `eliminationThreshold = 2`
  here (vs 3 in Score-sheet). At threshold the slot shows eliminated (display-only —
  the referee enforces, the teammate continues). The tracker must not overflow on
  narrow screens (fixes the Score-sheet regression too).
- Same chrome otherwise: scoreboard, 10s timer visible by default (`whopicture`
  settings key, beep-only on timeout, no auto-penalty), new-photo redraw.
- Audit strip from §2.3 covers attribution disputes; mistake counters are display-only
  and excluded from it.
- Reuse rule: extract `strike-tracker` from Score-sheet and `attribution` from Top-10
  into `shared/` with inputs (`eliminationThreshold`, points value/mode); minimally
  refactor those two old pages to use the shared components. No other old-page edits.
- `/manage`: photo visible only when the row is expanded.

## 4.5 v4 seeds (files only — owner imports)

`anameen.json` 100 subjects + `whopicture.json` 75 photos.

- Ana Meen clue ladder (THE key quality bar — review rejects files that miss it):
  clue 1 very very hard, clue 2 very hard, clue 3 hard, clue 4 medium, clue 5 easy.
  Keep the existing sample's clue style, and vary the angles across subjects: trophies
  won, transfer history, teammates he played with (across clubs / his nation), the
  leagues he played in (not just the club), career records. No answer field beyond
  `player` per `AUTHORING.md` §3.8.
- Who-in-Picture content rules (learned from the rejected first sample): prefer CLUBS
  over nations (33/33+ … nations only for famous sides where the room would know most
  of the XI); modern-era lean — nothing like Germany 1990 / Iran 2004; no charity /
  exhibition matches; local slice = Egyptian CLUBS (Al Ahly, Zamalek, + Pyramids' two
  CAF Champions League finals) not just the national team; source photos from the
  wider web (club sites / news galleries / Getty-style sources), Wikipedia Commons is
  one option, not the only one. Widely-mirrored URLs against link rot. Time-box the
  authoring: build fast, verify schema/dedupe/mix mechanically, one quick visual
  sanity pass per photo — no deep per-photo provenance rounds.
- Delivery: 25% sample first for review, then remaining 75% after approval.
  Committed importer-ready via the v2 importer schema; dry-run reviewed but NOT
  imported by agents — owner imports manually.

## 4.6 Tests & acceptance

- Backend: 5-clue enforcement, 11-name + title + URL enforcement, count defaults/clamps,
  admin gating on edit/delete, `/manage` parity (bulk + paged `/all` + PUT/DELETE).
- Frontend: all-clues-visible + attribution +1 and unassign + audit (no reveal mechanics
  left in code); photo contain-fit + loading state + both share buttons (native share,
  copy fallback); uncovered single-column names; shared strike-tracker incl. the
  2-strike eliminated flag without narrow-screen overflow (3-strike still green in
  Score-sheet); 10s whopicture timer.
- `ng build` green, detector clean, `CODE_STANDARDS.md` followed (no duplicated
  attribution/strike logic).
- Acceptance: full 3-subject Ana Meen game incl. a clue-5 solve still scoring 1; full
  11-player photo game incl. a 2-consecutive-strike elimination and a shared photo;
  edit a row in both pools.
