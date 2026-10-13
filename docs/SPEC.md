# Masa2o Ta7ady — Specification (v1 built)

> Clone of the فقرات (challenges) from YouTuber Nasouhi's show **صباحو تحدي**.
> Website only: frontend + backend. No game engine, no mobile app, no login.
> Status: v1 implemented and building. Last updated 2026-10-13.

## 1. Product idea

A website where friends play single **challenges** (translation of فقرة; one self-contained
round, never a full multi-challenge match). Each challenge has its own page with a scoreboard
and a timer. Anyone can add questions (live instantly); delete is open in v1 and becomes
admin-only later.

Core philosophy: **the referee is the game master (D&D style). The site assists, never
controls.** The referee reads questions aloud, reveals hidden answers, runs the timer, decides
points and draws, and awards/deducts at any moment. The site must never lock him out, enforce
turns, validate hints, or declare winners.

- Language: Arabic only, football only, RTL layout.
- Assumed knowledge: players already know the rules — the UI shows no rule explanations.

## 2. V1 challenges (all: 10 items per run, most points at the end wins, ties allowed)

### 2.1 Password (الباسورد)
One player per team sees the secret **player name**, gives a **1-word hint**, partner guesses.
Teams alternate; 30s per attempt. Forbidden hints (referee enforces, site does not check):
more than 1 word, a number, a human name, a club/city/country name.
Scoring: 1 point per solved name; 0 if both teams fail and the referee calls a draw.
Decided over 10 names (count selector: 5 / 10 / 15 / 20).

### 2.2 Acting (التمثيل)
Act the **player name** for 45s with no talking at all; teammate guesses within 45s and max
3 guesses. On failure the enemy team (both players) gets 10s and exactly 1 guess from the
same acting; a correct steal scores for them instead.
Scoring: 1 point per solved prompt (own team or steal). Decided over 10 prompts
(count selector: 5 / 10 / 15 / 20).

### 2.3 Ihbid Sahh (اهبد صح)
Both teams get the same question whose answer is a **number or date**; 30s to write it down.
Exact answer = 2 points, closer = 1 point. Same distance / same answer / both exact = draw
(1–1, or 2–2 if both exact). The referee judges closeness. All 10 questions visible from the
start, answers hidden with per-row reveal for the referee only
(count selector: 5 / 10 / 15 / 20).

### 2.4 Offside (أوفسايد)
Both teams get a rule (e.g. an Italian player) and write any matching player name in 10s.
Unique name = 1 point, duplicated name = 0. All 10 rules visible from the start.
Scoring is fully manual — the site only provides the scoreboard (± buttons).
(count selector: 5 / 10 / 15 / 20).

## 3. Games documented but NOT in v1 (rules recorded, do not re-ask)

- **Top 10:** prompt like "top 10 all-time Premier League scorers". Answering rank N scores
  N points (rank 1 = 1 pt … rank 10 = 10 pts). Answering rank 11 = −1, rank 13 = −3, etc.
  (penalty = rank − 10). Answering ranks 1+2+3 = 6 pts and clears negatives. List shows ranks 1–13.
- **Who is in the picture:** pre-match photo of 11 players; both teams alternate guesses,
  one guess per player per turn, 3 mistakes per player = elimination.
- **Score sheet:** e.g. "World Cup final 2022, France vs Argentina" — each team gets one side
  and guesses its full starting lineup; one guess per player per turn, 3 mistakes = elimination.
- **Bank, Ana Meen (Who am I), Risk, Bell/buzzer:** appeared in the show; rules not locked.
- Explicitly rejected for this project: XO, Auction, Connect 4, لبس صاحبك, يا دوبك,
  قتالين قتلة, خمسة في عشرة.

## 4. Pages and referee UX

- `/` home: 4 challenge buttons (titles only) + theme switcher (3 themes) + link to `/manage`.
- `/password`, `/acting`: grid of numbered flip-cards (tap = reveal name to referee),
  **always 2 cards per row**; dice icon on each card re-rolls just that card; "new draw"
  re-rolls all. Acting has two timers (45s main + 10s steal).
- `/ihbid`, `/offside`: full numbered list visible from the start; Ihbid answers hidden with
  per-row show/hide; dice icon per row re-rolls just that item.
- `/manage`: pool selector with 3 pools — player names (**one shared pool for Password +
  Acting**), Ihbid, Offside. Each pool: add form, paged list (`/all`), delete per row.
- Shared components: scoreboard (editable team names, ± always active, **scores never go
  negative**), timer (dev-configured default per challenge: Password 30s, Acting 45s + 10s
  steal, Ihbid 30s, Offside 10s; single icon-only start/pause toggle + icon-only reset;
  soft two-tone beep on timeout; referee may score before timeout).
- Deliberately absent in v1: round counters (3/10), turn indicators, undo, end/winner screens,
  play-again flow, score persistence (in-memory only), per-player tracking, tiebreakers.

## 5. Data model (PostgreSQL 18)

One table per question type. Password + Acting share a single merged pool:

- `player_names(id, player_name UNIQUE, created_at)` — serves Password and Acting.
- `ihbid_questions(id, question_text, answer_text, created_at)`.
- `offside_rules(id, rule_text, created_at)`.

Seed data (2026-10-13, via REST, still in DB): 52 players, 30 Ihbid, 30 Offside.
Re-run files: `../ta7ady-backend/seed-data.json` + `../ta7ady-backend/seed-run.ps1`.

## 6. Backend API (Spring Boot 4.1, Java 17, Lombok, `com.ta7ady.backend`)

Single controller/service/repo per table. `PlayerNamesController` is mapped to three URL
aliases (`/api/players` canonical + `/api/password` + `/api/acting`) serving the same rows,
so both frontend screens stay separate while the backend stays merged. CORS open for
`http://localhost:4200`. All responses JSON.

| Method | URL | Meaning |
|---|---|---|
| GET | `/api/players?count=X` (aliases `/api/password`, `/api/acting`) | X random player names (default 10, clamped 1–50) |
| GET | `/api/ihbid?count=X` | X random questions (default 10, clamped 1–50) |
| GET | `/api/offside?count=X` | X random rules (default 10, clamped 1–50) |
| GET | `/api/{players,ihbid,offside}/all?page=&size=&sort=` | Paged list (used by `/manage`) |
| POST | `/api/players` `{"playerName"}` | Create, live instantly |
| POST | `/api/ihbid` `{"questionText","answerText"}` | Create, live instantly |
| POST | `/api/offside` `{"ruleText"}` | Create, live instantly |
| DELETE | `/api/{players,ihbid,offside}/{id}` | Delete (open in v1 → admin-only later) |

Validation: trim; reject empty / <3 chars (Ihbid answer: non-empty); duplicate player names
rejected case-insensitively (409). No auth in v1.

## 7. Frontend architecture (Angular 22, standalone 4-file components)

- **Zoneless + Signals everywhere** (`provideZonelessChangeDetection()`; the project has no
  zone.js, so plain-property mutations never re-rendered — signals are load-bearing, not style).
  Lists load via `httpResource` (reactive to count/pool/page signals, built-in loading/error,
  `.reload()` for full redraws); mutations via `ApiService` observables + `firstValueFrom`.
  Scoreboard uses `model()` two-way bindings; parents pass their own signals directly.
- Structure: `home/`, `password/`, `acting/`, `ihbid/`, `offside/`, `manage/` (each `.ts` +
  `.html` + `.scss` + `.spec.ts`), `shared/timer/`, `shared/scoreboard/`, `api.service.ts`
  (CRUD + `API_BASE` export), `theme.service.ts` (signal + localStorage + `data-theme`).
- Themes (CSS vars only, switchable on home, persisted): `night` ليلي (default, green/black),
  `sand` رملي (warm sand + bronze secondary, light), `lapis` لازورد (Deep Lapis + Warm Sand +
  Muted Amber tokens: lapis/amber dark). Arabic font: Tajawal (400/700/800), radius 16px.
- Quality gates: `npx ng build` green; impeccable `detect.mjs` clean. One authored motion only
  (card flip, with `prefers-reduced-motion` off-ramp); timer bar animates via `transform`.

## 8. Deferred (do NOT build until asked)

Per-challenge bulk import (AI-generated JSON in one go); admin panel + admin-only delete;
Top 10 / Score sheet / Who-in-picture pages; tiebreakers; score persistence; end screens.

## 9. How to run

1. `docker compose up -d` (postgres 18, `username/password`, db `ta7ady`, port 5432).
2. Backend: `cd ta7ady-backend` → `.\mvnw spring-boot:run` (port 8080).
3. Frontend: `cd ta7ady-frontend` → `npx ng serve` (port 4200).
4. Tests: frontend specs exist per component (`ng test`); backend `mvn test` needs the DB up.

## 10. Decision log (why things are this way)

- Challenges, not matches — user plays single فقرات with friends, referee holding the phone.
- Referee = game master — all scoring/timing manual, no enforcement, no winner logic.
- 10 items each, highest total wins, draws allowed — may change later; count selector added.
- One merged player table, three URL aliases — Password and Acting need the same data.
- `?count=` on all random endpoints (1–50) instead of fixed 10.
- No negatives on the scoreboard (Top 10 is the only future exception).
- Single-card reroll (dice icon) in every challenge + full redraw kept.
- Arabic-only RTL UI, but project communication in English (OpenChamber has weak RTL support).
