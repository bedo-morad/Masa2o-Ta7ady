# SEEDS.md — seed data overview

`seeds/` holds the committed JSON question pools for Masa2o Ta7ady. Each file is
one pool for one game, imported by the backend bulk importers. Only the final
JSON files in `seeds/` are committed — the authoring side-channel files in
`seeds/_review/` are git-ignored and never ship.

Authoring rules for all pools live in `AUTHORING.md` (notably §1 and §2:
every text field ≥ 3 chars, timeless facts only, cut a fact if unsure).
Game rules live in `RULES.md`. The import pipeline is described in
`SPECV2.md` §2.8 and `SPECV4.md` §4.5.

## Pools

| File | Game / pool | Row schema |
|---|---|---|
| `anameen.json` | Ana Meen — guess the player | `{"player": "...", "clues": ["...", "...", "...", "...", "..."]}` — 5 clues per player |
| `bank.json` | Bank — generic rapid-fire Q&A | `{"question": "...", "answer": "..."}` — 1000 questions |
| `ihbid.json` | Q&A | `{"questionText": "...", "answerText": "..."}` — note the different field names from `bank.json`; do not merge the two schemas |
| `offside.json` | Offside | `{"ruleText": "..."}` — one rule/prompt per row, e.g. "Spanish player" |
| `players.json` | Player name pool | `{"playerName": "..."}` — Egyptian players |
| `risk.json` | Risk packs | `{"genre": "...", "questions": [{"points": 5, "question": "...", "answer": "..."}, {"points": 10, ...}, {"points": 20, ...}, {"points": 40, ...}]}` — 50 packs × 4 tiered questions = 200 questions |
| `scoresheet.json` | Score Sheet — match lineups | `{"match": "...", "teamA": "...", "teamB": "...", "lineupA": ["...", ×11], "lineupB": ["...", ×11]}` |
| `top10.json` | Top 10 — ranked lists | `{"prompt": "...", "answers": ["...", ×13]}` — each prompt asks for a top 13, with 13 answers |
| `who in the picture.json` | Who in the Picture — team photos | `{"title": "...", "photoUrl": "...", "players": ["...", ×11]}` — a team photo plus its starting XI |

## Detailed process docs

Two pools have their own full authoring and verification guides — follow those
instead of this overview when working on them:

- Bank: `docs/BANK_SEED_PROCESS.md` — 50 / 35 / 15 easy / medium / hard mix,
  ~25% Egypt-related, ~5% near-impossible "fear" questions, nothing before 1980.
- Risk: `docs/RISK_SEED_PROCESS.md` — tiers 5 / 10 / 20 / 40 must be strictly
  increasing in hardness inside a pack, ~26% Egypt-related genres.

## Adding or updating seeds

1. Edit only the committed JSON file in `seeds/`. Keep the schema exactly as
   in the table above — the importer stores only those fields.
2. Keep the authoring side-channel (difficulty/local tags, review samples,
   build tools) in `seeds/_review/`, which is git-ignored. Only the final
   JSON is committed.
3. Verify before delivery, where a verifier exists:
   - Bank: `python seeds/_review/bank_tool.py build`, then `... verify`
   - Risk: `node seeds/_review/validate-risk.mjs build`, then `... verify [path]`
4. For the pools without a dedicated process doc yet (`anameen.json`,
   `ihbid.json`, `offside.json`, `players.json`, `scoresheet.json`,
   `top10.json`, `who in the picture.json`), follow `AUTHORING.md` and the
   schema in the table above, and check the matching spec (`SPECV2.md` for
   Top 10 / Score Sheet, `SPECV4.md` for Ana Meen / Who in the Picture)
   before adding a new pool.
