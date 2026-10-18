# CODE_STANDARDS.md — how V4+ code must read (enforced on agents + humans)

V4 is the first PR held to this bar. Subagents and future work follow it verbatim.
Goal: no spaghetti, no duplicates, files a phone-referee project can maintain.

## 1. No duplication — extract, don't copy

- One implementation per concept. Attribution, strike-tracker, audit strip, bulk
  preview, `page(pool)`/`del(pool,id)`, timer wiring, count selector, Google-search
  icon, redraw/dice: each lives once in `shared/` or a generic service.
- New pages reuse `shared/attribution` + `shared/strike-tracker` with inputs
  (`points`, `mode`, `eliminationThreshold`) — never copy-paste Top-10/Score-sheet logic.
- Backend: reuse `BulkHelper<T>` + `BulkAdminController` + DTO records. No
  `Map<String,Object>` + `toString()` casts, no per-pool `bulk()` copies.
- If you touch an old file only to migrate it onto shared, keep the diff minimal and
  behaviour-identical (tests stay green).

## 2. Small readable files

- Target ≤ ~200 lines per `.ts` / `.java` / `.html`. Split by extraction: child
  components, pure helper functions, pipes, presenters. One file = one job, reads top-down.
- No logic in templates beyond `*if`/`*for` + bindings + event forwarding. No nested
  ternaries, no multi-line expressions in HTML.
- No `any` (frontend) / raw `Object` maps (backend). Name every shape (interface/DTO/record).
- Early returns over nesting. Max 3 levels of indentation; extract the rest.

## 3. Frontend architecture (Angular 22, zoneless + signals)

- `provideZonelessChangeDetection()`: all view state is signals (`signal`, `computed`,
  `model`). Plain-property mutation that must re-render is a bug.
- Loads via `httpResource` (reactive to signals, `.reload()` for redraws); mutations via
  `ApiService` + `firstValueFrom`. No manual subscriptions without `takeUntilDestroyed`.
- Standalone 4-file components (`.ts` + `.html` + `.scss` + `.spec.ts`). Every component
  ships a spec covering its math/state transitions (attribution, strikes, audit).
- `SettingsService` + `ThemeService` remain the only writers of settings/theme.
  New timers add a settings key (`anameen` 60s, `whopicture` 10s) + `timerKey` wiring.
- Arabic-only RTL UI. No English strings in templates. No rule-explainer text on play pages.
- Styling: CSS vars + theme tokens only. One authored motion max per page with
  `prefers-reduced-motion` off-ramp. `$frontend-design`: one signature element per new
  page, quiet disciplined chrome around it, responsive to 360px, visible focus.

## 4. Backend architecture (Spring Boot 4.1, Java 17)

- One controller/service/repo per pool, same validation spirit: trim, ≥3 chars
  (Ihbid answer non-empty), case-insensitive dedupe → 409, ordered-list lengths enforced
  (Ana Meen exactly 5 distinct clues; Who-picture exactly 11 distinct names + non-empty URL).
- `GET ?count=` defaults/clamps per spec (`anameen` 3 / 1–10, `whopicture` 1 / 1–5);
  `/all` paged; POST schemas exactly per `AUTHORING.md`; PUT/DELETE admin-gated via
  `AdminGate` (no flag → 401/403). CORS allows PUT.
- Tests per endpoint: validation, clamps/defaults, admin gates, order preservation.
  `mvn verify` green before landing.

## 5. Referee-first UX rules

- Referee = game master. Site assists, never enforces turns, locks, tiebreakers,
  winners, or auto-scoring beyond attribution deltas + BANK deltas.
- Scores may go negative everywhere. Manual ± always active. Audit strip for every
  auto-write (attribution/BANK); display-only trackers (strikes, cards, chains) stay out.
- Timers beep (Web Audio, no assets) and stop; they never auto-score, auto-eliminate,
  or auto-advance. Referee acts after timeout.

## 6. Quality gates (every commit)

- `mvn -B verify` (backend), `npx ng build` + `npx ng test --watch=false` (frontend),
  detector clean. No landing on red.
- Seeds: schema + lengths + NFC/diacritic dedupe + era/local mix report clean;
  25% sample reviewed before the remaining 75%. Agents build files only — owner imports.
- Commits: small, focused, conventional (`feat(v4-…)`, `fix(…)`, `seeds: …`, `docs: …`).
  One PR (`v4` → `master`) with spec-accurate body + verification counts.
