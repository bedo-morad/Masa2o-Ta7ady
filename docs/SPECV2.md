# SPECV2.md — content pipeline + Top 10 + Score Sheet + seeds

Target branch: `v2` → one big PR to `master` via small focused commits (one commit per
numbered section below). Language: `CONTEXT.md`. Rules: `RULES.md`. Authoring: `AUTHORING.md`.
v1 baseline: `SPEC.md`. Philosophy is unchanged: referee = game master, Arabic-only RTL,
no login, scores never negative, in-memory scores, no counters/end-screens/tiebreakers.

## 2.0 Build order (commit sequence)

1. Bulk importer (§2.1) — 2. Delete-only admin (§2.2) — 3. Attribution system (§2.3) —
   4. Top-10 backend (§2.4) — 5. Top-10 page (§2.5) — 6. Score-sheet backend (§2.6) —
   7. Score-sheet page (§2.7) — 8. Seed files (§2.8). Pipeline before content: 500-row
   review is impossible without the dry-run preview, and schemas must exist before seeds.

## 2.1 Bulk importer (`/manage`)

- Accepts **JSON only**, two entry points: file upload and paste-into-textarea. One parser,
  one schema per pool — the exact schemas in `AUTHORING.md` (also the single-add schemas).
- Flow per pool: choose pool → upload/paste → **dry-run preview** listing every row as
  valid or invalid (with per-row reason: too short, duplicate in file, duplicate in DB,
  wrong shape, wrong list length) → referee fixes the source or drops bad rows →
  **confirm import** writes only valid rows. Nothing saves before confirm.
- Reuses existing POST validation server-side (trim, ≥3 chars, case-insensitive dedupe).
- Large files must not freeze the phone UI: parse off the critical path, show progress.
- No difficulty field anywhere (see `CONTEXT.md`).

## 2.2 Delete-only admin (inside `/manage`)

- Single shared password from backend env var `ADMIN_PASSWORD`. No accounts, no roles.
- `/manage` shows an unlock banner: password prompt → correct sets a browser-session
  (tab-lifetime) flag → delete buttons appear. Wrong password = generic "wrong password",
  no hints, no lockout in v2.
- v2 powers: **delete only**. Edit arrives in v3. Adds stay instant-live for everyone
  (no review queue, ever — delete handles abuse).

## 2.3 Attribution system (shared, used by Top 10 / Score Sheet now, Who-in-Picture in v4)

- Interaction: referee taps an answer → picks team A or B → points auto-add; tapping again
  unassigns and reverses the exact points. Manual ± stays for everything else.
- Audit strip on the page: chronological "team ← answer (+N)" entries so a disputed tally
  is reconstructible without undo machinery.
- Attribution is display + auto-score, never enforcement: no turn order, no eligibility
  checks, no locks.

## 2.4 Top-10 backend

- Table `top10_lists(id, prompt, answers[13] as ordered JSONB/text-array, created_at)`.
- `GET /api/top10?count=X` (default 1 — one list is a full game; clamp 1–50) → X random lists with all 13 answers.
- `GET /api/top10/all` paged; `POST /api/top10 {"prompt","answers"[13]}` (reject unless
  exactly 13 non-empty distinct entries); `DELETE /api/top10/{id}` (admin-gated like all
  deletes from §2.2 onward).
- Scoring lives in the **frontend**: rank N (1–10) = N pts; 11/12/13 = −1/−2/−3; holding
  all three of 11+12+13 flips their contribution to +6. Backend stores no scores.

## 2.5 Top-10 page (`/top10`)

- Same referee chrome as v1 pages: scoreboard, dev timer (60s default — lists run long),
  count selector (lists per run, adjustable, default 1), full redraw + per-list dice reroll.
- One list at a time (a 13-answer board fills a phone): prompt on top, 13 tappable rows.
  Tap → assign team (points per §2.4) → row shows team color + rank value; tap again unassigns.
- "Next list" advances; answered lists stay reviewable within the run.

## 2.6 Score-sheet backend

- Table `scoresheet_matches(id, match_label, team_a, team_b, lineup_a[11], lineup_b[11],
  created_at)`. Exact 11+11 enforced on POST; no subs/coaches fields exist on purpose.
- `GET /api/scoresheet?count=X` (default 1 — one match is a full game; clamp 1–10 — matches are slow), `/all` paged,
  POST, admin-gated DELETE, same validation spirit as §2.4.

## 2.7 Score-sheet page (`/scoresheet`)

- Match label + both full lineups **visible to the referee from the start**, two columns
  labeled by side. Tap a player → assign team (+1 auto, §2.3); tap again unassigns.
- Same chrome: scoreboard, 60s timer, count selector (matches per run, adjustable,
  default 1), full redraw + per-match dice reroll.

## 2.8 v2 seed files (the dedicated seed agent's order)

`ta7ady-backend/seeds/`: `players.json` 300, `ihbid.json` 150, `offside.json` 150,
`top10.json` 75 lists, `scoresheet.json` 75 matches — all per `AUTHORING.md` (60/30/10 era
mix, no difficulty field, checklist §4). Imported through §2.1 with dry-run review.
v1 pools were wiped to zero; these files re-fill them.

## 2.9 Tests & acceptance

- Backend: validation tests per new endpoint (13-enforcement, 11+11-enforcement, dedupe,
  count clamp); admin-gate tests (delete without flag → 401/403, with flag → ok).
- Frontend specs per new/changed component (attribution math incl. the 11+12+13 → +6 flip,
  signal updates, timer still covered).
- `npx ng build` green; impeccable `detect.mjs` clean.
- Acceptance: import a 300-row file with 5 bad rows → preview flags exactly those 5 →
  confirm imports 295; lock admin, delete hidden; Top-10 full game incl. a negative-rank
  assignment and a 11+12+13 completion; score-sheet full game; scores never negative.
