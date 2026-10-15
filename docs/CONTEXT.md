# CONTEXT.md — Masa2o Ta7ady glossary

Shared language for all agents working on this repo. Glossary only — no implementation
details, no API shapes, no file names. (Those live in `SPEC.md` / `SPECV2-4.md`.)

## Core concepts

- **Challenge** — one self-contained round (فقرة). The site plays single challenges only,
  never a full multi-challenge match. v1: Password, Acting, Ihbid Sahh, Offside.
  v2 adds: Top 10, Score Sheet. v3 adds: Risk, Bank. v4 adds: Who-in-Picture, Ana Meen.
- **Referee (game master)** — the person holding the phone. Reads questions aloud, reveals
  hidden answers, runs timers, judges correctness, awards points, declares draws and winners.
  The site assists and never controls, enforces, or overrules.
- **Teams** — always two teams playing locally on the referee's screen. No accounts, no login.
- **Players** — individual humans inside a team (used only where a game needs per-person
  tracking, e.g. Who-in-Picture eliminations).
- **Scoreboard** — the manual ± tally per team. Scores may go below zero in every game.
  The referee may change scores at any moment, including before a timer ends.
- **Draw** — any item or challenge may end tied. The referee declares draws; the site never
  forces a tiebreaker and v1–v4 ship no tiebreaker logic.
- **Attribution** — tapping an answer to record *which team* gave it (Top 10, Score Sheet,
  Who-in-Picture). Attribution auto-adds the game's points and can be undone per assignment.

## Content concepts

- **Pool** — the question store for one challenge family. v1 pools: player names (shared by
  Password + Acting), Ihbid questions, Offside rules. Later: Top-10 lists, Score-sheet
  matches, Risk packs, Bank questions, Ana Meen subjects, Who-in-Picture photos.
- **Seed file** — a curated JSON file per pool (`seeds/*.json` at the project root), 75–500 entries
  depending on the pool, kept in git as the re-seeding source of truth. Imported through the
  bulk importer, never applied blindly.
- **Difficulty** — an *authoring rule*, not a stored field. No question carries a difficulty
  tag. Bands (see `AUTHORING.md`): Easy 60% / Medium 30% / Hard 10%, calibrated by era for
  fans of the last ~10 years of football. Exception: Risk, where difficulty is structural
  (point tiers 5/10/20/40 board positions).
- **Pack** — a Risk unit: one genre label + 4 tiered questions (5/10/20/40 pts). A game uses
  4 packs = 16 questions.
- **Clue** — an Ana Meen unit: one hidden player + 5 ordered clues (hard → easy), 60s each.
- **Subject** — one Ana Meen round (a player + its 5 clues). A challenge defaults to 3 subjects.
- **Round (Bank)** — one 120-second rapid-fire run of 12 questions for one team. A Bank
  challenge = 3 rounds per team (6 total).
- **Bank (verb)** — in the Bank game: locking currently-chained points into the safe total.
  Unbanked points double per consecutive correct answer (1→2→4→8…) and are lost on a miss.
- **Card (Risk)** — a physical, referee-managed power: Steal, Extra Time, Multiple Choice,
  Phone Call. Each team holds 4 cards, each usable once. Cards are referee-managed;
  the site shows a display-only used/unused tracker (reset per board) so a card cannot be
  reused by mistake — no enforcement beyond that.
- **Double** — the one randomly-hidden double-points question among Risk's 16. Revealed only
  when its question is revealed. Randomized on the device at draw time, never stored.
- **Steal (Risk)** — answering a question the other team failed, only before they answer.
  Referee-managed; the site tracks nothing about it.
- **Elimination (Who-in-Picture)** — a player erring 3 times sits out; the teammate continues.
  Mistakes attach to players, not teams. Tracked on screen, enforced by the referee.

## People and process

- **Seed agent** — the single dedicated agent that authors seed files. It works from
  `RULES.md` (how each game plays) + `AUTHORING.md` (what good questions look like).
- **Bulk importer** — the v2 UI that ingests seed files or pasted JSON with a dry-run
  preview. Accepts the same schema as single-add.
- **Admin** — delete power inside `/manage`, unlocked by one shared password (no accounts).
  v2: delete only. v3+: edit.
