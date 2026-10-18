import { Component, effect, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { httpResource } from '@angular/common/http';
import { API_BASE, Top10List } from '../api.service';
import { ScoreboardComponent } from '../shared/scoreboard/scoreboard.component';
import { TimerComponent } from '../shared/timer/timer.component';
import {
  AssignedTeam,
  AttributionChange,
  AttributionComponent,
  AuditEntry,
  AuditStripComponent,
} from '../shared/attribution/attribution.component';

// Frontend scoring is booked-effective: per list and team, `booked` tracks the
// net amount attribution actually added to the score. Each tap steers the
// booked amount toward the map's target contribution (the shared RankMap math
// in `shared/attribution/rank-points`), so completing the trio from zero scores
// exactly +6 (via a +9 catch-up over the booked -3) and the audit always sums
// to the score. Scores may go below zero. Backend stores no scores.
// The pure rank math itself lives once in the shared attribution mode:'rank'.
export { rankValue, teamContribution, trioHolder } from '../shared/attribution/rank-points';

import { RankMap, teamContribution, trioHolder } from '../shared/attribution/rank-points';

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
  readonly deadTurns = signal<Record<number, number>>({});
  readonly msg = signal('');
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
    this.deadTurns.set({});
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
    this.deadTurns.update((dd) => {
      if (!(list.id in dd)) return dd;
      const next = { ...dd };
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

  /** Applies delta directly (scores may go negative); audits the actual
   * amount, so the strip always sums to the score. Returns the delta. */
  private applyScore(team: 'A' | 'B', delta: number, label: string): number {
    if (delta === 0) return 0;
    if (team === 'A') this.scoreA.update((v) => v + delta);
    else this.scoreB.update((v) => v + delta);
    this.audit.update((es) => [...es.slice(-49), { seq: ++this.seq, team, label, delta }]);
    return delta;
  }

  // Referee-owned dead-turn tracker (display only): after 12 dead turns the
  // room gets a hint. Keyed per list, cleared when the list leaves the run.
  deadOf(listId: number): number {
    return this.deadTurns()[listId] ?? 0;
  }

  hintDue(listId: number): boolean {
    return this.deadOf(listId) >= 12;
  }

  bumpDead(listId: number, d: number): void {
    this.deadTurns.update((dd) => ({ ...dd, [listId]: Math.max(0, (dd[listId] ?? 0) + d) }));
  }

  resetDead(listId: number): void {
    this.deadTurns.update((dd) => {
      if (!(listId in dd)) return dd;
      const next = { ...dd };
      delete next[listId];
      return next;
    });
  }
}
