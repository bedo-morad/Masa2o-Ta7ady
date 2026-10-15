# SPECV3.md — Bank + Risk + question editing + seeds

Target branch: `v3` (branched from `master` after v2 merges) → one big PR via small focused
commits (one per numbered section). Requires v2 merged (importer, admin session flag,
attribution patterns). Terms: `CONTEXT.md`. Rules: `RULES.md`. Authoring: `AUTHORING.md`.

## 3.0 Build order

0. Bulk deduplication prep (§3.0.1) — 1. Question editing (§3.1) — 2. Bank backend (§3.2) —
   3. Bank page (§3.3) — 4. Risk backend (§3.4) — 5. Risk page (§3.5) — 6. Seeds (§3.6).

## 3.0.1 V3 prep: bulk deduplication (from V2 review)

- Backend: extract generic `BulkHelper<T>` (or base service) for the 5x `bulk()` copies
  (`Ihbid/Offside/PlayerName/Top10/ScoresheetService`): shared 413 check,
  `firstSeen/toSave/saveIndex/results` loop, placeholder + save pass. Per-pool lambdas
  only for `validate`, key extraction, `toEntity`, `save`. Unify `MAX_BULK_ROWS` and
  `str()/list()` helpers; introduce bulk-row DTO records to replace
  `Map<String,Object>` + `toString()` casts (kills the `match`/`matchLabel` alias hack).
- Controllers: shared base for `POST /bulk` + admin-gated `DELETE` (5x copies today).
- Frontend `api.service.ts`: generic `page(pool)` + `del(pool,id)` to replace the 5x
  `xxxPage()` / `deleteX()` copies. No behaviour change — `BulkAdminGateTest` stays green.
- Why now: V3 adds `bank` + `risk` pools; without this the copies go 5 → 7.

## 3.1 Question editing (extends the v2 delete-only admin)

- Every row in `/manage` gains an edit affordance (admin-unlocked only, same session flag).
- Edit UI: inline form prefilled with the row's current values, same validation as create;
  saving a duplicate of another row is rejected like a duplicate create.
- Applies to all pools existing at the time (v1 three + Top-10 + Score-sheet + new §3.2/§3.4).
- Still no review queue: edits apply instantly like adds.

## 3.2 Bank backend

- Table `bank_questions(id, question, answer, created_at)` — generic rapid-fire Q&A.
  Fully random draws; difficulty is never ordered, batched, or stored.
- `GET /api/bank?count=X` (callers use 12; default 12, clamp 1–50), `/all` paged, POST
  `{"question","answer"}`, admin-gated DELETE. Same validation spirit as v2 pools.

## 3.3 Bank page (`/bank`)

- Structure: 6 rounds (3 per team, alternating, referee picks who starts). Per round:
  referee draws 12, starts the 120s timer, reads rapid-fire; the run shows question +
  hidden answer with per-row reveal (Ihbid pattern).
- Chain tracker (display-only, referee-owned): current chain value selector showing
  1 → 2 → 4 → 8 … progression, a **BANK** button that moves the chain into that team's
  banked total, and a **MISS** button that zeroes the unbanked chain. All three are manual
  taps — the site computes nothing on its own and never auto-banks or auto-wipes.
- Round banked totals accumulate per team on the scoreboard (manual ± still available).
- Same chrome: scoreboard, count fixed at 12 per round (no selector — the rules fix it),
  per-round redraw, per-question dice reroll.

## 3.4 Risk backend

- Table `risk_packs(id, genre, questions[4 ordered by tier: 5/10/20/40, each with
  question+answer], created_at)`. POST enforces exactly 4 tiers in order with distinct
  questions. No double flag stored, no multiple-choice options stored (both by design —
  see `RULES.md`: double is device-randomized, options are referee-invented).
- `GET /api/risk?count=X` (callers use 4 = one board; default 4, clamp 1–12 packs),
  `/all` paged, POST, admin-gated DELETE.

## 3.5 Risk page (`/risk`)

- One board per game: 4 genre columns × 4 tier rows (5/10/20/40), drawn via `?count=4`.
- The device hides the **double** uniformly at random among the 16 at draw time (frontend
  only, never persisted, never sent). Tapping a question reveals it — and reveals whether
  it is the double — to the referee only.
- Answering is referee-judged: correct → referee taps team attribution for face value
  (×2 if doubled) via the §2.3 pattern; wrong → no auto-penalty, referee handles Steal /
  Extra Time / Multiple Choice physically (cards are site-invisible by design).
- Same chrome: scoreboard, 30s timer, new-board redraw. No per-question dice (a board is
  one fixed set of 16; re-draw the board instead).

## 3.6 v3 seeds

`risk.json` 50 packs + `bank.json` 300 questions, per `AUTHORING.md` (Risk tier↔era mapping:
5 = last-10y obvious, 10 = last-10y deep, 20 = 10–20y ago, 40 = 20+y, nothing before 1980;
Bank fully random difficulty). Imported via the v2 importer with dry-run review.

## 3.7 Tests & acceptance

- Backend: 4-tier enforcement, 12-count default, admin-gated edit + delete (edit without
  flag → 401/403), count clamps.
- Frontend: chain-tracker math is display-only (test it never writes scores by itself);
  double hidden uniformly and revealed only with its question; attribution ×2 path.
- `ng build` green, detector clean.
- Acceptance: full 6-round Bank game incl. a mid-chain bank and a mid-chain miss; full
  16-question Risk board incl. finding and scoring the double; edit a row in every pool.
