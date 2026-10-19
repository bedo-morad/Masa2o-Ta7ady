import { CountSelectorComponent } from '../shared/draw-controls/count-selector.component';
import { GameHeaderComponent } from '../shared/game-header/game-header.component';
import { Component, effect, inject, signal, viewChild } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { API_BASE, AnameenSubject, ApiService } from '../services/api.service';
import { AnameenTeam, ANAMEEN_COUNTS, ANAMEEN_COUNT_DEFAULT, ANAMEEN_POINTS } from './anameen.game';
import { ScoreboardComponent } from '../shared/scoreboard/scoreboard.component';
import { TimerComponent } from '../shared/timer/timer.component';
import { ItemNavigationComponent } from '../shared/item-navigation/item-navigation.component';
import { SettingsService } from '../services/settings.service';
import {
  AssignedTeam,
  AttributionChange,
  AttributionComponent,
  AuditEntry,
  attributionDeltas,
} from '../shared/attribution/attribution.component';
import { ScoreBooking } from '../shared/score-booking';

// Ana Meen (RULES.md / SPECV4 §4.2): a hidden player, five clues hard → easy,
// one subject on screen at a time — all five clues visible from the start, the
// referee reads them aloud one by one and the display never gates him. No
// "pick who starts": both teams guess the same subject simultaneously and the
// referee awards whoever solved first by tapping the team (+1 flat, any clue,
// shared §2.3 attribution; re-tap unassigns, reverses and audits). The 60s
// clock (`anameen` settings key) beeps and stops — no auto-anything. Referee
// tools: full redraw, per-subject dice reroll (`?count=`) and a new-game
// reset that clears every tally. Pure game shape lives in `anameen.game`.

@Component({
  selector: 'app-anameen',
  standalone: true,
  imports: [GameHeaderComponent, CountSelectorComponent,
    ScoreboardComponent,
    TimerComponent,
    ItemNavigationComponent,
    AttributionComponent,
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
  readonly assignments = signal<Record<number, AssignedTeam>>({});
  readonly audit = signal<AuditEntry[]>([]);
  readonly msg = signal('');
  readonly rerolling = signal(false);
  private readonly booking = new ScoreBooking(this.scoreA, this.scoreB, this.audit);

  readonly counts = ANAMEEN_COUNTS;
  readonly points = ANAMEEN_POINTS;

  private readonly res = httpResource<AnameenSubject[]>(
    () => `${API_BASE}/anameen?count=${this.count()}`,
  );
  readonly loading = this.res.isLoading;

  /** Held so moving between subjects hands the referee a fresh 60s clock. */
  private readonly timer = viewChild(TimerComponent);

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
  }

  nameOf(team: AnameenTeam): string {
    if (team === 'A') return this.teamA() || this.settings.teamA() || 'الفريق الأول';
    return this.teamB() || this.settings.teamB() || 'الفريق الثاني';
  }

  current(): AnameenSubject | undefined {
    const ss = this.subjects();
    return ss.length ? ss[Math.min(this.idx(), ss.length - 1)] : undefined;
  }

  clueAt(subject: AnameenSubject, k: number): string {
    return subject.clues[k - 1] ?? '';
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
    this.assignments.set({});
    this.scoreA.set(0);
    this.scoreB.set(0);
    this.audit.set([]);
    this.msg.set('');
    this.booking.resetSequence();
    this.reload();
  }

  assigned(id: number): AssignedTeam {
    return this.assignments()[id] ?? null;
  }

  /** Shared §2.3 contract: toggle math lives in the component, deltas: here. */
  onAssign(ch: AttributionChange): void {
    const subject = this.current();
    if (!subject) return;
    const { deltaA, deltaB } = attributionDeltas(ch.points, ch.from, ch.to);
    this.booking.book('A', deltaA, subject.player);
    this.booking.book('B', deltaB, subject.player);
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
        if (team) this.booking.book(team, -ANAMEEN_POINTS, old.player);
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


  private moveTo(i: number): void {
    const last = Math.max(0, this.subjects().length - 1);
    this.idx.set(Math.min(last, Math.max(0, i)));
    this.timer()?.reset();
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
}
