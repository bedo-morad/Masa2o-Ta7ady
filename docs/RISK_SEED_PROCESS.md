# RISK_SEED_PROCESS.md — how the Risk pack pool is authored and verified

Scope: `seeds/risk.json` — Risk packs, target **50 packs × 4 tiered questions = 200 Qs**.
Rules of the game: `RULES.md` → Risk. Authoring rules: `AUTHORING.md` §1 + §3.6.
Spec: `SPECV3.md` §3.6.

## 1. What a Risk pack is

Importer schema is exactly two fields per pack, one per question — nothing else may be stored:

```json
{
  "genre": "...",
  "questions": [
    { "points": 5,  "question": "...", "answer": "..." },
    { "points": 10, "question": "...", "answer": "..." },
    { "points": 20, "question": "...", "answer": "..." },
    { "points": 40, "question": "...", "answer": "..." }
  ]
}
```

Importer rules (v2 bulk pattern, which v3 reuses): JSON array, `genre` ≥ 3 chars, exactly 4
questions with `points` exactly `[5,10,20,40]` in order, in-batch duplicate **question** text
rejected, every text field ≥ 3 chars (`AUTHORING.md` §2). Numbers-only answers get a unit word
(`7 ألقاب`, `80 نقطة`) so the length floor holds.

## 2. Tier ↔ era + strictly increasing hardness

Audience: fans deep into the last ~10 years (today = 2026). Tier is the ladder; it is never
stored as a field.

| Tier | Era | Hardness |
|---|---|---|
| 5  | 2016–2026 | obvious to a fan, **never child-easy** (no Messi/Salah/"WC-2022 winner" gimmes) |
| 10 | 2016–2026 | deep cut only regular followers know |
| 20 | 2006–2015 | medium (10–20y) |
| 40 | 1980–2005 | really hard, near-impossible; **nothing before 1980** |

Hardness must be **strictly increasing** inside a pack: 10 harder than 5, 20 harder than 10,
40 harder than 20 — never a lower tier easier than a higher one. This is the failure mode the
current sample fixes: a pack whose four questions all sit at one difficulty is rejected.

## 3. Genre policy

- Genre kinds (max variety, no two packs sharing an angle): club, nation, competition, player,
  a **specific season for a club or a competition** (never a specific season for a nation),
  coach, transfers, records.
- **~26% local-themed genres**: the genre label *itself* is Egypt-related (target 13/50 = 26%).
- Genres may duplicate across packs only with fully different questions.
- Creative angles: follow the spec examples as style only, never copy them verbatim.

## 4. Difficulty/local are an authoring side-channel

The stored file stays schema-pure, so the ladder and the local flag live in authoring-only files
that never ship:

- `seeds/_review/risk_data.mjs` — source of truth: packs with `type`, `local`, `kind`, and each
  question's `band` (`modern-obvious`/`modern-deep`/`mid`/`old`) or `ob` obscurity rank. Season
  packs (`kind:"season"`) cover a single season *or* a single subject (one player/coach, one fixed
  era); they rise by obscurity `[1,2,3,4]` instead of by era.
- `seeds/_review/risk.sample.json` — generated, importer-ready (the review sample).
- `seeds/_review/risk.sample.meta.json` — parallel `{type, local, kind, bands, obscurity}` tags.

`seeds/_review/` is **git-ignored**: the sample is for human review, and only the final
`seeds/risk.json` is committed after approval. No app code changes.

## 5. Verification (run before every delivery)

`node seeds/_review/validate-risk.mjs build` then `... verify [path]`. The verifier:

1. **Dry-runs the importer schema** — array of packs, only `genre`/`questions`, genre ≥ 3 chars,
   exactly 4 questions, `points == [5,10,20,40]` in order, only `question`/`answer` keys.
2. **Field lengths** — every field ≥ 3 chars (`AUTHORING.md` §2).
3. **Dedupe** — normalizes each question (Unicode **NFC**, strips Arabic diacritics/tatweel,
   collapses whitespace, lowercase) and rejects any repeated key.
4. **Ladder** — recomputes the tier↔era bands from the side-channel and requires
   `modern-obvious/modern-deep/mid/old` in order (`kind:"era"`), or obscurity `[1,2,3,4]`
   (`kind:"season"`).
5. **Local ratio + variety** — recomputes the ~26% local-genre share and prints the genre-type
   breakdown and any repeated genre label.

Exit code is non-zero on any failure, so it can gate a batch before import. The verifier cannot
judge meaning; era correctness, fact confidence, the tier-5 floor and originality stay a human
pass (see `seeds/_review/RISK_PLAN.md` §5).

## 6. Rollout

- **Sample (approved as-is): 13 packs / 52 Qs** → `seeds/_review/risk.sample.json`, reviewed and
  accepted, including the season-obscurity ladder and the 3/13 local slice.
- **Full pool (this delivery): 50 packs / 200 Qs** → `seeds/risk.json`, all 200 Qs uniquely
  authored, verified PASS against the 50-pack target (13/50 = 26.0% local), then imported through
  the bulk importer's dry-run. Only `seeds/risk.json` is committed; no app code changes.
