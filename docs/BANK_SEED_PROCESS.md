# BANK_SEED_PROCESS.md — how the Bank pool is authored and verified

Scope: `seeds/bank.json` — generic rapid-fire Q&A, target **500** (then growth to **1000** at the
end of V3). Rules of the game: `RULES.md` → Bank. Authoring rules: `AUTHORING.md` §1 + §3.7.
Spec: `SPECV3.md` §3.6.

## 1. What a Bank row is

Importer schema is exactly two fields — nothing else may be stored:

```json
{ "question": "...", "answer": "..." }
```

Importer rules (v2 bulk pattern, which v3 reuses): JSON array, `question` ≥ 3 chars,
`answer` non-empty, in-batch duplicate **questions** rejected (key = trimmed lowercase question).
`AUTHORING.md` §2 is stricter and is the rule we hold ourselves to: **every text field ≥ 3 chars**.

## 2. Authoring rules (per question)

- **Difficulty by era, never stored.** Bank is pushed slightly harder than the base mix:
  **50 / 35 / 15** easy / medium / hard.
  - easy — last ~10 years, well-known, still never child-easy.
  - medium — 10–20 years ago, or last-10-years deep cuts only regular followers know.
  - hard — older than ~20 years, but never ancient: **nothing before 1980**.
- **~25% local (Egypt-related)**, spread across **all three bands** — not only easy.
  "Local" means anything about Egypt: players, league/cup, clubs, national teams, and Egyptian
  sides/players/nation in African or international competition. (Other Arab/MENA facts are *not*
  local by this rule; they sit in the world buckets.)
- **~5% near-impossible "fear" questions** (`AUTHORING.md` §3.7) — any era, still nothing before
  1980, timeless, cut-if-unsure. Tagged in the side-channel, never in the stored file.
- **Timeless facts only** (records, founding years, historical results) — never current-season
  stats that rot.
- **Cut if unsure.** A wrong answer poisons game night; an uncertain fact is deleted, not guessed.
- **Short, read-aloud-friendly questions; short one-fact answers.**
- **Max template variety** (`AUTHORING.md` §3.7): rotate phrasings across top scorer of nation/club,
  where-20XX-was-held, nationality, club-where-he-started, shirt-number-ish, look-easy-but-hard and
  look-hard-but-easy angles, results/scorers and the already-made styles. The verifier reports the
  count of distinct question leads (first three words) and lists any lead reused more than twice, so
  repetition is visible rather than accidental. Follow the spec examples as style only, never
  verbatim.

## 3. Difficulty/local spread are an authoring side-channel

The stored file stays schema-pure, so each row also carries `band` + `local` (+ `fear`) tags in
authoring-only files that never ship:

- `seeds/_review/bank_data.py` — the 125-question review sample, `(question, answer, band, local)` tuples.
- `seeds/_review/bank_data2.py` — the final 375, same tuples plus `FEAR_QUESTIONS` (the fear texts).
- `seeds/_review/bank_tool.py` — builds `seeds/bank.json` + `bank.meta.json`, then verifies.
- `seeds/bank.json` — the committed, importer-ready pool (500).
- `seeds/_review/bank.meta.json` — parallel `{band, local, fear}` tags for mix review.

`seeds/_review/` is **git-ignored**: the sample and the tooling are for authoring/review, and only
the final `seeds/bank.json` is committed. No app code changes.

## 4. Verification (run before every delivery)

`python seeds/_review/bank_tool.py build` then `... verify`. The verifier:

1. **Dry-runs the importer schema** — array of objects, only `question`/`answer` keys, both strings.
2. **Field lengths** — every field ≥ 3 chars (`AUTHORING.md` §2).
3. **Dedupe** — normalizes each question (Unicode **NFC**, strips Arabic diacritics/tatweel,
   collapses whitespace, lowercase — so presentation-only differences can't slip through) and
   rejects any repeated key, mirroring the importer's `trim().toLowerCase()` question key.
4. **Mix** — recomputes the easy/medium/hard split from the meta tags and checks it against
   50 / 35 / 15 (±1.5pp).
5. **Local spread** — recomputes the ~25% local share (±2pp) and prints the per-band breakdown.
6. **Fear** — recomputes the ~5% fear share (`AUTHORING.md` §3.7) and checks it (±1.5pp).
7. **Variety** — prints the number of distinct question leads and lists any lead reused >2×.
8. **Cut-if-unsure** — every fact is one the author is highly confident is correct.

Exit code is non-zero on any failure, so it can gate a batch before import.

## 5. Rollout

- **Sample: 125 questions** (25%) reviewed and approved.
- **Final: 500** — `seeds/bank.json`, verified with the tool against the 500 targets
  (mix **250 / 175 / 75**, local **125**, fear **26**, dedupe clean), then imported through the
  bulk importer's dry-run.
- **Later: 1000.** Add batches of new angles; re-run dedupe against the whole pool and keep the
  50 / 35 / 15 mix, ~25% local and ~5% fear at the larger size.
