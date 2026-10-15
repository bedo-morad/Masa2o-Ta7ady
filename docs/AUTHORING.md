# AUTHORING.md — how to write questions for every pool

The single reference for the seed agent and any human adding content in bulk.
Game rules: `RULES.md`. Terms: `CONTEXT.md`. All content: Arabic only, football only.

## 1. Difficulty (authoring rule, never a stored field)

No schema below contains a difficulty tag. Difficulty is enforced while writing, by era,
for an audience of fans deeply into the **last ~10 years** of football:

- **Easy (60%)** — last 10 years, well-known. Still never child-easy: no Messi, no Salah,
  no "World Cup 2022 winner". Floor example: a 2018 World Cup semifinalist coach, a UCL
  top scorer of the last decade not named Ronaldo/Messi.
- **Medium (30%)** — 10–20 years ago, or last-10-years deep cuts only regular followers know.
  Example: 2010s Europa League winners, Aboutrika-era Ahly details.
- **Hard (10%)** — older than ~20 years, but never ancient: nothing before 1980, nothing like
  "who won the 1967 Champions League". Example: 1990s AFCON scorers, pre-2000 Ballon d'Or
  one-off winners.
- Target mix per file: **60 / 30 / 10**. Verify the mix before delivering a file.
- **Egyptian content (25%)**: this is an Egyptian game — about one quarter of every file
  must be Egyptian: local and international Egyptian players, league and cup, national
  teams (all ages/genders you are sure about), Egyptian clubs, and Egyptian
  clubs/players/nation in African and international competitions. Spread it across all
  three difficulty bands, not just the easy ones.
- Prefer timeless facts (records, founding years, all-time lists) over current-season stats
  that rot. Every fact must be one you are highly confident is correct — a wrong answer
  poisons game night. When unsure, cut the question.

## 2. JSON plumbing (all pools)

- One file per pool in `seeds/` at the project root (`players.json`, `ihbid.json`,
  `offside.json`, `top10.json`, `scoresheet.json`, `risk.json`, `bank.json`,
  `anameen.json`, `whopicture.json`).
- Files import through the bulk importer (file upload or paste, JSON only) with a dry-run
  preview: fix every flagged row before confirming. The importer accepts exactly the schemas
  below — the same schemas single-add uses.
- Duplicates (case-insensitive) are rejected: never repeat an entry inside or across files
  for the same pool. Minimum 3 characters per text field.

## 3. Per-pool schemas, style, and examples

### 3.1 Player names — `{"playerName": "..."}` (Password + Acting share this pool)

Just the name in Arabic script (Egyptian spelling). Mix eras, positions, clubs, nations;
lean Egyptian/Arab + world stars. No clue fields, no categories — the games need names only.

```json
[
  { "playerName": "أشرف حكيمي" },
  { "playerName": "محمد الشناوي" },
  { "playerName": "علي معلول" }
]
```

### 3.2 Ihbid — `{"questionText": "...", "answerText": "..."}`

Question answerable by a **number or date** teams can write down and be "closer" on.
Timeless records and founding years only. Answer is the exact value as plain text.

```json
[
  { "questionText": "كم عدد كؤوس العالم التي فازت بها البرازيل؟", "answerText": "5" },
  { "questionText": "في أي سنة أقيمت أول بطولة كأس عالم؟", "answerText": "1930" }
]
```

### 3.3 Offside rules — `{"ruleText": "..."}`

Short category prompts the referee reads aloud; players answer with unique names.
One category per entry, no lists, no answers stored. Mix world + Egyptian/Arab flavor.

```json
[
  { "ruleText": "لاعب إيطالي" },
  { "ruleText": "حارس مرمى فاز بكأس العالم" },
  { "ruleText": "لاعب لعب للأهلي والزمالك" }
]
```

### 3.4 Top-10 lists — `{"prompt": "...", "answers": ["rank1", ..., "rank13"]}`

Prompt + **exactly 13** ordered answers, rank 1 first. Ranks 1–10 score their rank value;
11/12/13 score −1/−2/−3, and all three together flip to +6 (system-computed, never stored).
Entries must be unambiguous full names. Verify the real order twice — a misordered list
breaks scoring, not just trivia.

```json
[
  {
    "prompt": "أعلى 13 هدافًا في تاريخ الدوري الإنجليزي",
    "answers": ["...", "..."]
  }
]
```

### 3.5 Score-sheet matches — `{"match": "...", "teamA": "...", "teamB": "...", "lineupA": ["...", ×11], "lineupB": ["...", ×11]}`

Famous matches only. Exactly 11 names per side, kickoff order, no substitutes, no coaches.
`match` names the game (e.g. "نهائي كأس العالم 2022"), `teamA`/`teamB` name the sides.

```json
[
  {
    "match": "نهائي كأس العالم 2022",
    "teamA": "الأرجنتين",
    "teamB": "فرنسا",
    "lineupA": ["...", "..."],
    "lineupB": ["...", "..."]
  }
]
```

### 3.6 Risk packs — `{"genre": "...", "questions": [{"points": 5|10|20|40, "question": "...", "answer": "..."} ×4]}`

One genre label + exactly 4 questions, one per tier, in tier order. Tier ↔ era mapping:
5 = last-10-years obvious (no child-easy); 10 = last-10-years deep; 20 = 10–20 years ago;
40 = 20+ years ago, really hard, nothing before 1980. No double flag stored — the site
hides the double among the 16 at draw time. No multiple-choice options stored — the
referee invents them live. Genres may be trophy, competition, player, club, continent,
nation, or one specific season of any of those.

```json
[
  {
    "genre": "ريال مدريد",
    "questions": [
      { "points": 5, "question": "...", "answer": "..." },
      { "points": 10, "question": "...", "answer": "..." },
      { "points": 20, "question": "...", "answer": "..." },
      { "points": 40, "question": "...", "answer": "..." }
    ]
  }
]
```

### 3.7 Bank questions — `{"question": "...", "answer": "..."}`

Rapid-fire generic Q&A with short answers. Fully random difficulty per round (never batched
or sorted — luck of the draw is the game). Short, read-aloud-friendly, one-fact answers.

```json
[
  { "question": "...", "answer": "..." }
]
```

### 3.8 Ana Meen subjects — `{"player": "...", "clues": ["...", ×5]}`

Hidden subject is always a player. Exactly 5 clues, ordered hard → easy (clue 1 hardest,
clue 5 near-giveaway). Each clue standalone intelligible; later clues narrow, never repeat
earlier ones. No answer field beyond `player`.

```json
[
  { "player": "...", "clues": ["...", "...", "...", "...", "..."] }
]
```

### 3.9 Who-in-picture — `{"photoUrl": "...", "players": ["...", ×11]}`

`photoUrl` = hotlink to a pre-match team photo of 11 (v4; uploads come later).
`players` = exactly the 11 pictured names, any order. Prefer widely-mirrored photos to
survive link rot; nothing you would not want shared to a room full of phones.

```json
[
  { "photoUrl": "https://...", "players": ["...", "..."] }
]
```

## 4. Delivery checklist (per file)

1. Entry count hits the version's target (v2: players 300, Ihbid 150, Offside 150,
   Top-10 lists 75, Score-sheet matches 75).
2. 60/30/10 era mix verified by sampling, with ~25% Egyptian content in every file.
3. No duplicates within or across same-pool files; every text field ≥ 3 chars.
4. Lists ordered and complete (13 answers, 11+11 lineups, 4-tier packs, 5 clues, 11 photo names).
5. Zero uncertain facts — cut, don't guess.
