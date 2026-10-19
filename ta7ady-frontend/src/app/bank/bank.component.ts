import { GoogleSearchComponent } from '../shared/google-search/google-search.component';
import { GameHeaderComponent } from '../shared/game-header/game-header.component';
import { Component, effect, inject, signal, viewChild } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { API_BASE, BankQuestion } from '../api.service';
import { ScoreboardComponent } from '../shared/scoreboard/scoreboard.component';
import { TimerComponent } from '../shared/timer/timer.component';
import { SettingsService } from '../shared/settings/settings.service';
import {
  AuditEntry,
  AuditStripComponent,
} from '../shared/attribution/attribution.component';
import { ScoreBooking } from '../shared/score-booking';

// Bank (RULES.md / SPECV3 §3.3): six rounds, three per team, alternating — the
// referee picks who opens once and the site alternates from there. The whole
// game is ONE draw: 72 questions fetched once and chunked 12 per round, so
// nothing repeats. A round plays its 12 cards one at a time on a 120s clock
// (`bank` settings key); each card shows question and answer openly — the
// referee sees both by design, there is no reveal tap — with a Google
// fact-check icon and Prev/Next card arrows (greyed at the ends). No in-round
// redraw and no per-question dice: the luck of the draw is the game.
//
// The chain tracker is display-only and referee-owned. It starts at 0: Correct
// sets 1 on a zeroed chain, else doubles (1 → 2 → 4 → 8 … capped at 2048);
// MISS zeroes the unbanked chain. BANK is the ONLY tap that writes points — it
// moves the chain into that round's team total (scoreboard delta, like
// attribution) plus an audit entry, then resets the chain to 0. Correct/Miss
// never touch a score; scores may go below zero and the manual ± stays live.

export const BANK_ROUNDS = 6;
export const BANK_PER_ROUND = 12;
/** One draw per game: 6 rounds × 12 questions (SPECV3 §3.2/§3.3). */
export const BANK_TOTAL = BANK_ROUNDS * BANK_PER_ROUND;
export const BANK_CHAIN_MAX = 2048;

export type BankTeam = 'A' | 'B';

const freshChains = (): number[] => Array.from({ length: BANK_ROUNDS }, () => 0);
const freshBanked = (): number[] => Array.from({ length: BANK_ROUNDS }, () => 0);

@Component({
  selector: 'app-bank',
  standalone: true,
  imports: [GameHeaderComponent, GoogleSearchComponent, ScoreboardComponent, TimerComponent, AuditStripComponent],
  templateUrl: './bank.component.html',
  styleUrl: './bank.component.scss',
})
export class BankComponent {
  private settings = inject(SettingsService);

  readonly teamA = signal('');
  readonly teamB = signal('');
  readonly scoreA = signal(0);
  readonly scoreB = signal(0);

  /** The referee picks the opening team once; the rest auto-alternates. */
  readonly startTeam = signal<BankTeam | null>(null);
  /** The single 72-question draw, sliced 12 at a time per round. */
  readonly questions = signal<BankQuestion[]>([]);
  readonly idx = signal(0);
  /** Cursor into the round's 12 cards. */
  readonly qIdx = signal(0);
  /** Per-round unbanked chain (display-only; 0 by default and after any bank). */
  readonly chains = signal<number[]>(freshChains());
  /** Per-round banked amount, for the round-history strip. */
  readonly banked = signal<number[]>(freshBanked());
  readonly audit = signal<AuditEntry[]>([]);
  readonly msg = signal('');
  private readonly booking = new ScoreBooking(this.scoreA, this.scoreB, this.audit);

  readonly rounds = Array.from({ length: BANK_ROUNDS }, (_, i) => i);
  readonly total = BANK_TOTAL;
  readonly perRound = BANK_PER_ROUND;
  readonly maxChain = BANK_CHAIN_MAX;

  private readonly res = httpResource<BankQuestion[]>(
    () => `${API_BASE}/bank?count=${BANK_TOTAL}`,
  );
  readonly loading = this.res.isLoading;

  /** Held so a round change can hand the referee a fresh 120s clock. */
  private readonly timer = viewChild(TimerComponent);

  constructor() {
    effect(() => {
      const rows = this.res.value();
      if (rows) {
        this.questions.set(rows);
        this.qIdx.set(0);
        this.msg.set(rows.length ? '' : 'لا توجد أسئلة بنك بعد — أضف من صفحة إدارة الأسئلة.');
      }
      if (this.res.error()) this.msg.set('تعذر التحميل — تأكد أن السيرفر يعمل.');
    });
  }

  /** Round 0 opens with the picked team, then the two alternate. */
  teamOfRound(i: number): BankTeam | null {
    const start = this.startTeam();
    if (!start) return null;
    const other: BankTeam = start === 'A' ? 'B' : 'A';
    return i % 2 === 0 ? start : other;
  }

  nameOf(team: BankTeam | null): string {
    if (team === 'A') return this.teamA() || this.settings.teamA() || 'الفريق الأول';
    if (team === 'B') return this.teamB() || this.settings.teamB() || 'الفريق الثاني';
    return '';
  }

  /** The 12-question slice drawn for one round of the single 72-draw. */
  roundQuestions(i: number): BankQuestion[] {
    return this.questions().slice(i * BANK_PER_ROUND, (i + 1) * BANK_PER_ROUND);
  }

  currentRoundQuestions(): BankQuestion[] {
    return this.roundQuestions(this.idx());
  }

  /** The one card on screen: the round's card under the cursor. */
  currentQuestion(): BankQuestion | null {
    return this.currentRoundQuestions()[this.qIdx()] ?? null;
  }

  qCount(): number {
    return this.currentRoundQuestions().length;
  }


  chainOf(i: number): number {
    return this.chains()[i] ?? 0;
  }

  bankedOf(i: number): number {
    return this.banked()[i] ?? 0;
  }

  pickStart(team: BankTeam): void {
    this.startTeam.set(team);
  }

  prev(): void {
    this.idx.update((i) => Math.max(0, i - 1));
    this.qIdx.set(0);
    this.timer()?.reset();
  }

  next(): void {
    this.idx.update((i) => Math.min(BANK_ROUNDS - 1, i + 1));
    this.qIdx.set(0);
    this.timer()?.reset();
  }

  go(i: number): void {
    this.idx.set(i);
    this.qIdx.set(0);
    this.timer()?.reset();
  }

  /** Walk the round's cards; both ends stop rather than wrap. */
  qPrev(): void {
    this.qIdx.update((i) => Math.max(0, i - 1));
  }

  qNext(): void {
    const last = this.qCount() - 1;
    if (last < 0) return;
    this.qIdx.update((i) => Math.min(last, i + 1));
  }

  /** Doubles the round's displayed chain; a Correct on a zeroed chain sets 1. */
  correct(): void {
    this.setChain((c) => (c <= 0 ? 1 : Math.min(BANK_CHAIN_MAX, c * 2)));
  }

  /** Miss zeroes the unbanked chain — the site never wipes it on its own. */
  miss(): void {
    this.setChain(() => 0);
  }

  /** The only tap that writes points: banks the chain, then zeroes it. */
  bank(): void {
    const i = this.idx();
    const amount = this.chainOf(i);
    const team = this.teamOfRound(i);
    if (!team || amount <= 0) return;
    this.booking.book(team, amount, `بنك الدور ${i + 1}`);
    this.banked.update((bs) => {
      const next = [...bs];
      next[i] = (next[i] ?? 0) + amount;
      return next;
    });
    this.chains.update((cs) => {
      const next = [...cs];
      next[i] = 0;
      return next;
    });
  }

  /** Fresh game: re-gate the start team, clear every tally, draw 72 again. */
  newGame(): void {
    this.startTeam.set(null);
    this.idx.set(0);
    this.qIdx.set(0);
    this.chains.set(freshChains());
    this.banked.set(freshBanked());
    this.audit.set([]);
    this.scoreA.set(0);
    this.scoreB.set(0);
    this.booking.resetSequence();
    this.msg.set('');
    this.res.reload();
  }

  private setChain(step: (chain: number) => number): void {
    const i = this.idx();
    this.chains.update((cs) => {
      const next = [...cs];
      next[i] = step(next[i] ?? 0);
      return next;
    });
  }

}
