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
  saving a duplicate of another row is rejected like a duplicate create. Backend: admin-gated
  PUT per pool (without flag → 401/403).
- Applies to all pools existing at the time (v1 three + Top-10 + Score-sheet + new §3.2/§3.4 = 7).
- Still no review queue: edits apply instantly like adds. Settings timer overrides gain
  `bank` (120s) + `risk` (30s) keys.

## 3.2 Bank backend

- Table `bank_questions(id, question, answer, created_at)` — generic rapid-fire Q&A.
  Fully random draws; difficulty is never ordered, batched, or stored.
- `GET /api/bank?count=X` (game draws 72 once = 6 rounds × 12; default 12, clamp 1–100),
  `/all` paged, POST `{"question","answer"}`, admin-gated DELETE + admin-gated PUT
  (edit per §3.1). Same validation spirit as v2 pools.

## 3.3 Bank page (`/bank`)

- Structure: 6 rounds (3 per team, alternating; referee picks who starts once, then
  auto-alternates with Prev/Next + dots). All 72 questions are drawn once at game start
  (`?count=72`, chunked 12 per round) so no question repeats across rounds. Each round:
  120s timer, rapid-fire; one question card at a time showing question + answer openly
  (no hidden/reveal — referee-visible by design), with Prev/Next question buttons
  (greyed at first/last). Card counter is a styled pill showing question number only
  (`N/12`, no round tag). Layout order per round: timer → question card → chain box.
  No explanatory/rules text on the page. Each card has a Google
  search icon (Ihbid pattern) for on-the-fly fact-check. No redraw button inside a round,
  no per-question dice (luck of the draw is the game). Answered rounds stay reviewable.
- Chain tracker (display-only, referee-owned): chain starts at 0; Correct sets 1 on a
  zeroed chain else doubles (1 → 2 → 4 → 8 … capped at 2048), MISS zeroes the unbanked
  chain, **BANK** moves the chain into that team's banked total (scoreboard + audit entry)
  and resets the chain to 0. The tracker shows the current chain value only (no full
  1→2048 ladder list). All three are manual taps — the site computes nothing on its
  own and never auto-banks or auto-wipes. BANK writes to the scoreboard (like attribution
  deltas); Correct/Miss never write scores by themselves.
- Round-history strip (audit-strip pattern): banked amount per round per team, plus the
  §2.3 audit entries for BANK writes. Manual ± still available.
- Same chrome: scoreboard, 120s timer (`bank` settings key), count fixed at 12 per round
  (no selector — the rules fix it).

## 3.4 Risk backend

- Table `risk_packs(id, genre, questions[4 ordered by tier: 5/10/20/40, each with
  question+answer], created_at)`. POST enforces exactly 4 tiers in order with distinct
  questions (never 20→pick-4; one genre = exactly its 4 tiered Qs). Genres may duplicate
  across packs. No double flag stored, no multiple-choice options stored (both by design —
  see `RULES.md`: double is device-randomized, options are referee-invented).
- `GET /api/risk?count=X` (callers use 4 = one board; default 4, clamp 1–12 packs),
  `/all` paged, POST, admin-gated DELETE + admin-gated PUT (edit per §3.1).

## 3.5 Risk page (`/risk`)

- One board per game: 4 genre columns × 4 tier rows (5/10/20/40), drawn via `?count=4`.
  Columns = genres, rows = tiers on desktop and phone. Answered questions dim but stay
  tappable for unassign (Top-10 pattern); the board stays reviewable.
- The device hides the **double** uniformly at random among the 16 at draw time (frontend
  only, never persisted, never sent). Tapping a question reveals it — and reveals whether
  it is the double (referee-only badge, never before reveal).
- Genre reroll: each genre column has a reroll affordance (e.g. unlucky 3× local genres).
  Reroll fetches one fresh pack (`?count=1`) and swaps the whole column (genre + its 4 Qs).
  Double handling: if the double was already found/scored, no new double is hidden;
  otherwise the double is re-hidden uniformly among the currently-unanswered questions
  (so a rerolled-away hidden double cannot be lost or duplicated).
- Answering is referee-judged: correct → referee taps the team button for face value
  (×2 if doubled) via the §2.3 pattern; wrong → no auto-penalty. Team buttons are big,
  side-by-side on the same row. The spotlight header is centered (genre + this question's
  points value) with the Google search icon at the row end (left in RTL) for on-the-fly
  fact-check. No explanatory/rules text on the page. Cards are
  referee-managed with a display-only tracker: 4 powers per team (Steal / Extra Time /
  Multiple Choice / Phone Call), used/unused toggles, reset on new board, excluded from
  the audit strip — it exists only so a spent card cannot be reused.
- Same chrome: scoreboard, 30s timer (`risk` settings key), new-board redraw. No
  per-question dice (a board is one fixed set of 16; re-draw the board or reroll a genre
  instead).

## 3.6 v3 seeds

`risk.json` 50 packs + `bank.json` 500 questions (Bank later grows to 1000 at end of V3),
per `AUTHORING.md` (Risk tier↔era mapping: 5 = last-10y obvious, 10 = last-10y deep,
20 = 10–20y ago, 40 = 20+y near-impossible, nothing before 1980; Bank 50/35/15 mix,
slightly harder than base; ~25% local content — Risk as local-themed genres; creative
new angles, never verbatim copies of the spec examples). Imported via the v2 importer
with dry-run review. Seed workers deliver a 25% sample first for review, then the
remaining 75% after approval.

## 3.7 Tests & acceptance

- Backend: 4-tier enforcement, Bank 12-default / 100-clamp and 72-game draw, Risk 4-default
  clamp, admin-gated edit (PUT) + delete (edit/delete without flag → 401/403), count clamps.
- Frontend: chain-tracker Correct/Miss never write scores by themselves (BANK writes via
  scoreboard delta + audit); double hidden uniformly and revealed only with its question
  (incl. genre-reroll re-hide rule); attribution ×2 path; 4-card tracker display-only
  (used/unused, reset per board); Risk spotlight carries one Google fact-check icon per
  question and big side-by-side team award buttons with no points text beside them.
- `ng build` green, detector clean.
- Acceptance: full 6-round Bank game from one 72-draw incl. a mid-chain bank and a
  mid-chain miss; full 16-question Risk board incl. finding and scoring the double,
  a genre reroll, and card-tracker use; edit a row in every pool (all 7).
