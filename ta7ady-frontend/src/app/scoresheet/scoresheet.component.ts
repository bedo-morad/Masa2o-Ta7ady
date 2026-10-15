import { Component, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { httpResource } from '@angular/common/http';
import { API_BASE, ScoresheetMatch } from '../api.service';
import { ScoreboardComponent } from '../shared/scoreboard/scoreboard.component';
import { TimerComponent } from '../shared/timer/timer.component';
import { SettingsService } from '../shared/settings/settings.service';
import {
  AssignedTeam,
  AuditEntry,
  AuditStripComponent,
} from '../shared/attribution/attribution.component';

// Score Sheet (RULES.md): each correct player name = 1 point, attributed by
// referee tap. Both full lineups are referee-visible from the start.
// Side lock: the right column (side A) always scores for team A, the left
// column (side B) for team B (RTL). Tapping a player card assigns +1 to that
// column's team; tapping again unassigns (-1).
// Scoring is booked-effective like Top-10 (see its header): per match and team,
// `booked` tracks the net attributed amount actually in the score, so reversals
// always land exactly. Scores may go below zero.

export type Side = 'A' | 'B';
export type PlayerMap = Record<string, AssignedTeam>; // "A:3" / "B:7" -> team

export interface StrikeSlot {
  name: string;
  mistakes: number;
}

export function playerKey(side: Side, index: number): string {
  return `${side}:${index}`;
}

function countTeam(m: PlayerMap, team: 'A' | 'B'): number {
  let n = 0;
  for (const t of Object.values(m)) if (t === team) n += 1;
  return n;
}

@Component({
  selector: 'app-scoresheet',
  standalone: true,
  imports: [
    FormsModule,
    RouterLink,
    ScoreboardComponent,
    TimerComponent,
    AuditStripComponent,
  ],
  templateUrl: './scoresheet.component.html',
  styleUrl: './scoresheet.component.scss',
})
export class ScoresheetComponent {
  private settings = inject(SettingsService);
  readonly teamA = signal('');
  readonly teamB = signal('');
  readonly scoreA = signal(0);
  readonly scoreB = signal(0);
  readonly count = signal(1);
  readonly matches = signal<ScoresheetMatch[]>([]);
  readonly idx = signal(0);
  readonly assignments = signal<Record<number, PlayerMap>>({});
  readonly booked = signal<Record<number, { A: number; B: number }>>({});
  readonly audit = signal<AuditEntry[]>([]);
  readonly strikes = signal<Record<number, StrikeSlot[]>>({});
  readonly msg = signal('');
  private seq = 0;

  private readonly res = httpResource<ScoresheetMatch[]>(
    () => `${API_BASE}/scoresheet?count=${this.count()}`,
  );
  readonly loading = this.res.isLoading;

  constructor() {
    effect(() => {
      const rows = this.res.value();
      if (rows) {
        this.reconcile(rows);
        this.msg.set(rows.length ? '' : 'لا توجد مباريات بعد — أضف من صفحة إدارة الأسئلة.');
      }
      if (this.res.error()) this.msg.set('تعذر التحميل — تأكد أن السيرفر يعمل.');
    });
  }

  current(): ScoresheetMatch | undefined {
    const ms = this.matches();
    return ms.length ? ms[Math.min(this.idx(), ms.length - 1)] : undefined;
  }

  assigned(matchId: number, key: string): AssignedTeam {
    return this.assignments()[matchId]?.[key] ?? null;
  }

  keyOf(side: Side, i: number): string {
    return playerKey(side, i);
  }

  prev(): void {
    this.idx.update((i) => Math.max(0, i - 1));
  }

  next(): void {
    this.idx.update((i) => Math.min(Math.max(0, this.matches().length - 1), i + 1));
  }

  go(i: number): void {
    this.idx.set(i);
  }

  reload(): void {
    this.strikes.set({});
    this.res.reload();
  }

  /** Side-locked toggle: the card's own column decides the team (A right,
   * B left). Tap assigns +1, tap again unassigns (-1). */
  onToggle(match: ScoresheetMatch, side: Side, index: number, player: string): void {
    const key = playerKey(side, index);
    const team: 'A' | 'B' = side;
    const all = { ...this.assignments() };
    const prevMap = all[match.id] ?? {};
    const nextMap: PlayerMap = { ...prevMap };
    if (nextMap[key]) delete nextMap[key];
    else nextMap[key] = team;
    all[match.id] = nextMap;
    this.assignments.set(all);
    const b = this.booked()[match.id] ?? { A: 0, B: 0 };
    const tA = countTeam(nextMap, 'A');
    const tB = countTeam(nextMap, 'B');
    const eA = this.applyScore('A', tA - b.A, player);
    const eB = this.applyScore('B', tB - b.B, player);
    this.booked.update((bb) => ({ ...bb, [match.id]: { A: b.A + eA, B: b.B + eB } }));
  }

  /** Reverse one match's booked points and drop its assignments. */
  private reverseMatch(match: ScoresheetMatch): void {
    const b = this.booked()[match.id] ?? { A: 0, B: 0 };
    if (b.A !== 0) this.applyScore('A', -b.A, match.matchLabel);
    if (b.B !== 0) this.applyScore('B', -b.B, match.matchLabel);
    const all = { ...this.assignments() };
    delete all[match.id];
    this.assignments.set(all);
    this.booked.update((bb) => {
      const next = { ...bb };
      delete next[match.id];
      return next;
    });
    this.strikes.update((ss) => {
      if (!(match.id in ss)) return ss;
      const next = { ...ss };
      delete next[match.id];
      return next;
    });
  }

  /** Swap in a fresh run: reverse matches that vanished, keep surviving ones. */
  private reconcile(rows: ScoresheetMatch[]): void {
    const ids = new Set(rows.map((m) => m.id));
    for (const old of this.matches()) {
      if (!ids.has(old.id)) this.reverseMatch(old);
    }
    this.matches.set(rows);
    for (const m of rows) this.slotsOf(m);
    this.idx.update((i) => Math.min(i, Math.max(0, rows.length - 1)));
  }

  /** Applies delta directly (scores may go negative); audits the actual
   * amount, so the strip always sums to the score. Returns the delta. */
  private applyScore(team: 'A' | 'B', delta: number, label: string): number {
    if (delta === 0) return 0;
    if (team === 'A') this.scoreA.update((v) => v + delta);
    else this.scoreB.update((v) => v + delta);
    this.audit.update((es) => [...es.slice(-49), { seq: ++this.seq, team, label, delta }]);
    return delta;
  }

  // Per-match mistake tracker (display only, referee enforces): 4 named slots
  // (2 per side); 3 mistakes eliminates that player. Keyed per match id,
  // cleared when the match leaves the run. Defaults pair each side's team
  // name with its persisted settings player ("<team> - <player>"); empty
  // settings fall back to the generic numbered defaults.
  /** Strike slot label: the saved player name alone when there is one,
   * otherwise "<team> - لاعب <n>" so the four slots stay distinguishable. */
  private slotName(team: string, player: string | undefined, ordinal: string): string {
    const n = (player ?? '').trim();
    return n ? n : `${team} - لاعب ${ordinal}`;
  }

  private defaultSlotNames(a: string, b: string): string[] {
    const pa = this.settings.playersA();
    const pb = this.settings.playersB();
    return [
      this.slotName(a, pa[0], '١'),
      this.slotName(a, pa[1], '٢'),
      this.slotName(b, pb[0], '١'),
      this.slotName(b, pb[1], '٢'),
    ];
  }

  slotsOf(match: ScoresheetMatch): StrikeSlot[] {
    const existing = this.strikes()[match.id];
    if (existing) return existing;
    const a = this.teamA() || match.teamA || 'الفريق الأول';
    const b = this.teamB() || match.teamB || 'الفريق الثاني';
    const fresh = this.defaultSlotNames(a, b).map((name) => ({ name, mistakes: 0 }));
    this.strikes.update((ss) => ({ ...ss, [match.id]: fresh }));
    return fresh;
  }

  /** Swap the two team names at the scoreboard. Names only — the strike slots,
   * scores, assignments and audit are deliberately left untouched. */
  swapTeams(): void {
    const oldA = this.teamA();
    const oldB = this.teamB();
    if (!oldA && !oldB) return;
    this.teamA.set(oldB);
    this.teamB.set(oldA);
  }

  isOut(slot: StrikeSlot): boolean {
    return slot.mistakes >= 3;
  }

  setSlotName(matchId: number, i: number, name: string): void {
    this.strikes.update((ss) => {
      const cur = ss[matchId];
      if (!cur) return ss;
      const next = cur.map((s, j) => (j === i ? { ...s, name } : s));
      return { ...ss, [matchId]: next };
    });
  }

  bumpMistake(matchId: number, i: number, d: number): void {
    this.strikes.update((ss) => {
      const cur = ss[matchId];
      if (!cur) return ss;
      const next = cur.map((s, j) =>
        j === i ? { ...s, mistakes: Math.min(3, Math.max(0, s.mistakes + d)) } : s,
      );
      return { ...ss, [matchId]: next };
    });
  }

  resetSlot(matchId: number, i: number): void {
    this.strikes.update((ss) => {
      const cur = ss[matchId];
      if (!cur) return ss;
      const next = cur.map((s, j) => (j === i ? { ...s, mistakes: 0 } : s));
      return { ...ss, [matchId]: next };
    });
  }
}
