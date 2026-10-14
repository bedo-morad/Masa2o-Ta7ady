import { Component, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { httpResource } from '@angular/common/http';
import { API_BASE, ApiService, ScoresheetMatch } from '../api.service';
import { ScoreboardComponent } from '../shared/scoreboard/scoreboard.component';
import { TimerComponent } from '../shared/timer/timer.component';
import {
  AssignedTeam,
  AttributionChange,
  AttributionComponent,
  AuditEntry,
  AuditStripComponent,
} from '../shared/attribution/attribution.component';

// Score Sheet (RULES.md): each correct player name = 1 point, attributed by
// referee tap. Both full lineups are referee-visible from the start.
// Scoring is booked-effective like Top-10 (see its header): per match and team,
// `booked` tracks the net attributed amount actually in the score, so clamped
// reversals never leave phantom audit entries.

export type Side = 'A' | 'B';
export type PlayerMap = Record<string, AssignedTeam>; // "A:3" / "B:7" -> team

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
    AttributionComponent,
    AuditStripComponent,
  ],
  templateUrl: './scoresheet.component.html',
  styleUrl: './scoresheet.component.scss',
})
export class ScoresheetComponent {
  private api = inject(ApiService);

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
  readonly msg = signal('');
  readonly rerolling = signal<number | null>(null);
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
    this.res.reload();
  }

  onPick(match: ScoresheetMatch, key: string, player: string, ch: AttributionChange): void {
    const all = { ...this.assignments() };
    const prevMap = all[match.id] ?? {};
    const from = prevMap[key] ?? null;
    const to: AssignedTeam = from === ch.picked ? null : ch.picked;
    if (from === to) return;
    const nextMap: PlayerMap = { ...prevMap };
    if (to) nextMap[key] = to;
    else delete nextMap[key];
    all[match.id] = nextMap;
    this.assignments.set(all);
    const b = this.booked()[match.id] ?? { A: 0, B: 0 };
    const tA = countTeam(nextMap, 'A');
    const tB = countTeam(nextMap, 'B');
    const eA = this.applyScore('A', tA - b.A, player);
    const eB = this.applyScore('B', tB - b.B, player);
    this.booked.update((bb) => ({ ...bb, [match.id]: { A: b.A + eA, B: b.B + eB } }));
  }

  async rerollOne(i: number): Promise<void> {
    if (this.rerolling() !== null) return;
    this.rerolling.set(i);
    try {
      const fresh = await firstValueFrom(this.api.scoresheetRandom(6));
      const ids = new Set(this.matches().map((m) => m.id));
      const pick = fresh.find((r) => !ids.has(r.id)) ?? fresh[0];
      if (pick) {
        const old = this.matches()[i];
        if (old) this.reverseMatch(old);
        this.matches.update((ms) => ms.map((m, j) => (j === i ? pick : m)));
      }
    } catch {
      this.msg.set('تعذر تبديل المباراة — حاول مجددًا.');
    } finally {
      this.rerolling.set(null);
    }
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
  }

  /** Swap in a fresh run: reverse matches that vanished, keep surviving ones. */
  private reconcile(rows: ScoresheetMatch[]): void {
    const ids = new Set(rows.map((m) => m.id));
    for (const old of this.matches()) {
      if (!ids.has(old.id)) this.reverseMatch(old);
    }
    this.matches.set(rows);
    this.idx.update((i) => Math.min(i, Math.max(0, rows.length - 1)));
  }

  /** Applies delta with the zero floor; audits the effective amount only, so the
   * strip always sums to the score. Returns the effective delta. */
  private applyScore(team: 'A' | 'B', delta: number, label: string): number {
    if (delta === 0) return 0;
    let eff = 0;
    if (team === 'A') {
      const o = this.scoreA();
      const n = Math.max(0, o + delta);
      this.scoreA.set(n);
      eff = n - o;
    } else {
      const o = this.scoreB();
      const n = Math.max(0, o + delta);
      this.scoreB.set(n);
      eff = n - o;
    }
    if (eff !== 0)
      this.audit.update((es) => [...es.slice(-49), { seq: ++this.seq, team, label, delta: eff }]);
    return eff;
  }
}
