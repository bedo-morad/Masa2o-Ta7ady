import { Component, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { httpResource } from '@angular/common/http';
import { API_BASE, ApiService, Top10List } from '../api.service';
import { ScoreboardComponent } from '../shared/scoreboard/scoreboard.component';
import { TimerComponent } from '../shared/timer/timer.component';
import {
  AssignedTeam,
  AttributionChange,
  AttributionComponent,
  AuditEntry,
  AuditStripComponent,
} from '../shared/attribution/attribution.component';

// Frontend scoring (RULES.md Top 10): rank N (1-10) = N pts; 11/12/13 =
// -1/-2/-3. Holding all three of 11+12+13 flips the trio from -6 to +6.
// Scoring is booked-effective: per list and team, `booked` tracks the net amount
// attribution actually added to the score (post floor-clamp). Each tap steers the
// booked amount toward the map's target contribution, so clamped-away negatives
// never resurrect (completing the trio from zero scores exactly +6) and the audit
// always sums to the score. Backend stores no scores.
export function rankValue(rank: number): number {
  if (rank <= 10) return rank;
  if (rank === 11) return -1;
  if (rank === 12) return -2;
  return -3;
}

export type RankMap = Record<number, AssignedTeam>;

export function trioHolder(m: RankMap): AssignedTeam {
  const a = m[11];
  if (a && a === m[12] && a === m[13]) return a;
  return null;
}

export function teamContribution(m: RankMap, team: 'A' | 'B'): number {
  let s = 0;
  for (let r = 1; r <= 13; r++) if (m[r] === team) s += rankValue(r);
  if (trioHolder(m) === team) s += 12;
  return s;
}

@Component({
  selector: 'app-top10',
  standalone: true,
  imports: [
    FormsModule,
    RouterLink,
    ScoreboardComponent,
    TimerComponent,
    AttributionComponent,
    AuditStripComponent,
  ],
  templateUrl: './top10.component.html',
  styleUrl: './top10.component.scss',
})
export class Top10Component {
  private api = inject(ApiService);

  readonly teamA = signal('');
  readonly teamB = signal('');
  readonly scoreA = signal(0);
  readonly scoreB = signal(0);
  readonly count = signal(1);
  readonly lists = signal<Top10List[]>([]);
  readonly idx = signal(0);
  readonly assignments = signal<Record<number, RankMap>>({});
  readonly booked = signal<Record<number, { A: number; B: number }>>({});
  readonly audit = signal<AuditEntry[]>([]);
  readonly msg = signal('');
  readonly rerolling = signal<number | null>(null);
  private seq = 0;

  private readonly res = httpResource<Top10List[]>(
    () => `${API_BASE}/top10?count=${this.count()}`,
  );
  readonly loading = this.res.isLoading;

  constructor() {
    effect(() => {
      const rows = this.res.value();
      if (rows) {
        this.reconcile(rows);
        this.msg.set(rows.length ? '' : 'لا توجد قوائم بعد — أضف من صفحة إدارة الأسئلة.');
      }
      if (this.res.error()) this.msg.set('تعذر التحميل — تأكد أن السيرفر يعمل.');
    });
  }

  current(): Top10List | undefined {
    const ls = this.lists();
    return ls.length ? ls[Math.min(this.idx(), ls.length - 1)] : undefined;
  }

  assigned(listId: number, rank: number): AssignedTeam {
    return this.assignments()[listId]?.[rank] ?? null;
  }

  trioOf(listId: number): AssignedTeam {
    return trioHolder(this.assignments()[listId] ?? {});
  }

  valueOf(rank: number): number {
    return rankValue(rank);
  }

  prev(): void {
    this.idx.update((i) => Math.max(0, i - 1));
  }

  next(): void {
    this.idx.update((i) => Math.min(Math.max(0, this.lists().length - 1), i + 1));
  }

  go(i: number): void {
    this.idx.set(i);
  }

  reload(): void {
    this.res.reload();
  }

  onAssign(list: Top10List, rank: number, ch: AttributionChange): void {
    const all = { ...this.assignments() };
    const prevMap = all[list.id] ?? {};
    const from = prevMap[rank] ?? null;
    const to: AssignedTeam = from === ch.picked ? null : ch.picked;
    const nextMap: RankMap = { ...prevMap };
    if (to) nextMap[rank] = to;
    else delete nextMap[rank];
    all[list.id] = nextMap;
    this.assignments.set(all);
    const b = this.booked()[list.id] ?? { A: 0, B: 0 };
    const label = list.answers[rank - 1] ?? '';
    const eA = this.applyScore('A', teamContribution(nextMap, 'A') - b.A, label);
    const eB = this.applyScore('B', teamContribution(nextMap, 'B') - b.B, label);
    this.booked.update((bb) => ({ ...bb, [list.id]: { A: b.A + eA, B: b.B + eB } }));
  }

  async rerollOne(i: number): Promise<void> {
    if (this.rerolling() !== null) return;
    this.rerolling.set(i);
    try {
      const fresh = await firstValueFrom(this.api.top10Random(6));
      const ids = new Set(this.lists().map((l) => l.id));
      const pick = fresh.find((r) => !ids.has(r.id)) ?? fresh[0];
      if (pick) {
        const old = this.lists()[i];
        if (old) this.reverseList(old);
        this.lists.update((ls) => ls.map((l, j) => (j === i ? pick : l)));
      }
    } catch {
      this.msg.set('تعذر تبديل القائمة — حاول مجددًا.');
    } finally {
      this.rerolling.set(null);
    }
  }

  /** Reverse one list's booked points and drop its assignments. */
  private reverseList(list: Top10List): void {
    const b = this.booked()[list.id] ?? { A: 0, B: 0 };
    if (b.A !== 0) this.applyScore('A', -b.A, list.prompt);
    if (b.B !== 0) this.applyScore('B', -b.B, list.prompt);
    const all = { ...this.assignments() };
    delete all[list.id];
    this.assignments.set(all);
    this.booked.update((bb) => {
      const next = { ...bb };
      delete next[list.id];
      return next;
    });
  }

  /** Swap in a fresh run: reverse boards that vanished, keep surviving ones. */
  private reconcile(rows: Top10List[]): void {
    const ids = new Set(rows.map((l) => l.id));
    for (const old of this.lists()) {
      if (!ids.has(old.id)) this.reverseList(old);
    }
    this.lists.set(rows);
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
