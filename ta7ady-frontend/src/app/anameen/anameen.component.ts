import { Component, effect, inject, signal, untracked, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { httpResource } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { API_BASE, AnameenSubject, ApiService } from '../api.service';
import {
  AnameenTeam,
  ANAMEEN_CLUES,
  ANAMEEN_COUNTS,
  ANAMEEN_COUNT_DEFAULT,
  ANAMEEN_POINTS,
  canReveal,
  nextReveal,
} from './anameen.game';
import { ScoreboardComponent } from '../shared/scoreboard/scoreboard.component';
import { TimerComponent } from '../shared/timer/timer.component';
import { SettingsService } from '../shared/settings/settings.service';
import {
  AssignedTeam,
  AttributionChange,
  AttributionComponent,
  AuditEntry,
  AuditStripComponent,
  attributionDeltas,
} from '../shared/attribution/attribution.component';

// Ana Meen (RULES.md / SPECV4 §4.2): a hidden player, five clues hard → easy,
// one subject at a time. Clue 1 opens with the 60s clock (`anameen` settings
// key, beep-only); the next clue reveals on a referee tap OR the clock's
// timeout — the one agreed auto-move (Q13), never auto-scoring. A correct
// guess is +1 flat whichever clue cracked it, booked through the shared §2.3
// attribution; re-tap unassigns, reverses and audits. Subjects alternate
// between the two teams from the opening pick (bank pattern). Referee tools:
// full redraw + per-subject dice reroll, both `?count=`. After all five clues
// are open the clock just expires — the referee judges, the site never
// declares the subject solved. Pure game shape lives in `anameen.game`.

@Component({
  selector: 'app-anameen',
  standalone: true,
  imports: [
    FormsModule,
    RouterLink,
    ScoreboardComponent,
    TimerComponent,
    AttributionComponent,
    AuditStripComponent,
  ],
  templateUrl: './anameen.component.html',
  styleUrl: './anameen.component.scss',
})
export class AnameenComponent {
  private api = inject(ApiService);
  private settings = inject(SettingsService);

  readonly teamA = signal('');
  readonly teamB = signal('');
  readonly scoreA = signal(0);
  readonly scoreB = signal(0);
  /** Subjects per challenge: 1 / 3 / 5 / 10, default 3. */
  readonly count = signal<number>(ANAMEEN_COUNT_DEFAULT);
  readonly subjects = signal<AnameenSubject[]>([]);
  readonly idx = signal(0);
  /** subjectId → clues opened so far; clue 1 ships revealed. */
  readonly opened = signal<Record<number, number>>({});
  readonly assignments = signal<Record<number, AssignedTeam>>({});
  readonly audit = signal<AuditEntry[]>([]);
  readonly msg = signal('');
  readonly rerolling = signal(false);
  private seq = 0;

  readonly startTeam = signal<AnameenTeam | null>(null);
  readonly clueSlots = Array.from({ length: ANAMEEN_CLUES }, (_, i) => i + 1);
  readonly counts = ANAMEEN_COUNTS;

  private readonly res = httpResource<AnameenSubject[]>(
    () => `${API_BASE}/anameen?count=${this.count()}`,
  );
  readonly loading = this.res.isLoading;

  readonly timer = viewChild(TimerComponent);

  constructor() {
    effect(() => {
      const rows = this.res.value();
      if (rows) {
        this.subjects.set(rows);
        this.idx.set(0);
        this.msg.set(rows.length ? '' : 'لا يوجد لاعبون مخفيون بعد — أضف من صفحة إدارة الأسئلة.');
      }
      if (this.res.error()) this.msg.set('تعذر التحميل — تأكد أن السيرفر يعمل.');
    });
    effect(
      () => {
        const t = this.timer();
        if (t && t.expired()) {
          untracked(() => this.revealNext());
        }
      },
      { allowSignalWrites: true },
    );
  }

  /** Subject 0 ships to the opening team, then the two alternate. */
  teamOf(i: number): AnameenTeam | null {
    const start = this.startTeam();
    if (!start) return null;
    const other: AnameenTeam = start === 'A' ? 'B' : 'A';
    return i % 2 === 0 ? start : other;
  }

  nameOf(team: AnameenTeam | null): string {
    if (team === 'A') return this.teamA() || this.settings.teamA() || 'الفريق الأول';
    if (team === 'B') return this.teamB() || this.settings.teamB() || 'الفريق الثاني';
    return '';
  }

  current(): AnameenSubject | undefined {
    const ss = this.subjects();
    return ss.length ? ss[Math.min(this.idx(), ss.length - 1)] : undefined;
  }

  openedOf(id: number): number {
    return this.opened()[id] ?? 1;
  }

  clueAt(subject: AnameenSubject, k: number): string {
    return subject.clues[k - 1] ?? '';
  }

  canOpenMore(subject: AnameenSubject): boolean {
    return canReveal(this.openedOf(subject.id));
  }

  /** Tap or timeout: open the next easier clue on a fresh clock. */
  revealNext(): void {
    const subject = this.current();
    if (!subject) return;
    const cur = this.openedOf(subject.id);
    if (!canReveal(cur)) return;
    this.opened.update((o) => ({ ...o, [subject.id]: nextReveal(cur) }));
    this.timer()?.reset();
  }

  pickStart(team: AnameenTeam): void {
    this.startTeam.set(team);
  }

  setCount(n: number): void {
    if (!this.counts.includes(n) || n === this.count()) return;
    this.count.set(n);
    this.idx.set(0);
  }

  reload(): void {
    this.idx.set(0);
    this.res.reload();
  }

  newGame(): void {
    this.startTeam.set(null);
    this.idx.set(0);
    this.assignments.set({});
    this.opened.set({});
    this.scoreA.set(0);
    this.scoreB.set(0);
    this.audit.set([]);
    this.msg.set('');
    this.seq = 0;
    this.res.reload();
  }

  assigned(id: number): AssignedTeam {
    return this.assignments()[id] ?? null;
  }

  /** Shared §2.3 contract: toggle math lives in the component, deltas: here. */
  onAssign(ch: AttributionChange): void {
    const subject = this.current();
    if (!subject) return;
    const { deltaA, deltaB } = attributionDeltas(ch.points, ch.from, ch.to);
    this.applyScore('A', deltaA, subject.player);
    this.applyScore('B', deltaB, subject.player);
    this.assignments.update((m) => {
      const next = { ...m };
      if (ch.to) next[subject.id] = ch.to;
      else delete next[subject.id];
      return next;
    });
  }

  /** Dice reroll: swap the subject, reversing its +1 with an audited -1. */
  async reroll(i: number): Promise<void> {
    if (this.rerolling()) return;
    this.rerolling.set(true);
    try {
      const fresh = await firstValueFrom(this.api.anameenRandom(1));
      const subject = fresh[0];
      if (!subject) throw new Error('empty');
      const old = this.subjects()[i];
      if (old) {
        const team = this.assignments()[old.id] ?? null;
        if (team) this.applyScore(team, -ANAMEEN_POINTS, old.player);
        this.assignments.update((m) => {
          const next = { ...m };
          delete next[old.id];
          return next;
        });
      }
      this.subjects.update((ss) => ss.map((s, k) => (k === i ? subject : s)));
      if (i === this.idx()) this.timer()?.reset();
      this.msg.set('');
    } catch {
      this.msg.set('تعذر دسّة هذا الموضوع — حاول مجددًا.');
    } finally {
      this.rerolling.set(false);
    }
  }

  googleUrl(name: string): string {
    return `https://www.google.com/search?q=${encodeURIComponent(name)}`;
  }

  /** Applies a delta directly (scores may go negative); audits the actual
   * amount so the strip always sums to the score. */
  private applyScore(team: AnameenTeam, delta: number, label: string): number {
    if (delta === 0) return 0;
    if (team === 'A') this.scoreA.update((v) => v + delta);
    else this.scoreB.update((v) => v + delta);
    this.audit.update((es) => [...es.slice(-49), { seq: ++this.seq, team, label, delta }]);
    return delta;
  }

  prev(): void {
    this.moveTo(this.idx() - 1);
  }

  next(): void {
    this.moveTo(this.idx() + 1);
  }

  go(i: number): void {
    this.moveTo(i);
  }

  private moveTo(i: number): void {
    const last = Math.max(0, this.subjects().length - 1);
    this.idx.set(Math.min(last, Math.max(0, i)));
    this.timer()?.reset();
  }
}
