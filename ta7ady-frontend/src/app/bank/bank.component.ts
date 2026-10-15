import { Component, effect, inject, signal, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { httpResource } from '@angular/common/http';
import { API_BASE, BankQuestion } from '../api.service';
import { ScoreboardComponent } from '../shared/scoreboard/scoreboard.component';
import { TimerComponent } from '../shared/timer/timer.component';
import { SettingsService } from '../shared/settings/settings.service';
import {
  AuditEntry,
  AuditStripComponent,
} from '../shared/attribution/attribution.component';

// Bank (RULES.md / SPECV3 §3.3): each team plays 3 rounds — 6 rounds total,
// alternating. The whole game is ONE draw: 72 questions fetched once and
// chunked 12 per round, so nothing repeats across rounds. Each round runs on a
// 120s clock (`bank` settings key) of rapid-fire questions with a
// referee-revealed answer per row (Ihbid pattern). There is no in-round redraw
// and no per-question dice — the luck of the draw is the game.
//
// The chain tracker is display-only and referee-owned: the site computes
// nothing on its own and never auto-banks or auto-wipes. Correct doubles the
// shown chain (1 → 2 → 4 → 8 … capped at 2048), MISS snaps the unbanked chain
// to zero, and BANK is the ONLY tap that writes points — it moves the chain
// into that round's team total (scoreboard delta, like attribution) plus an
// audit entry, then resets the chain to 1. Correct/Miss never touch a score.
// Scores may go below zero; the manual ± stays available throughout.

export const BANK_ROUNDS = 6;
export const BANK_PER_ROUND = 12;
/** One draw per game: 6 rounds × 12 questions (SPECV3 §3.2/§3.3). */
export const BANK_TOTAL = BANK_ROUNDS * BANK_PER_ROUND;
export const BANK_CHAIN_MAX = 2048;
/** The ladder the referee reads: 1, 2, 4 … 2048 (12 rungs). */
export const BANK_CHAIN_STEPS: readonly number[] = Array.from(
  { length: 12 },
  (_, i) => 2 ** i,
);

export type BankTeam = 'A' | 'B';

const freshChains = (): number[] => Array.from({ length: BANK_ROUNDS }, () => 1);
const freshBanked = (): number[] => Array.from({ length: BANK_ROUNDS }, () => 0);

@Component({
  selector: 'app-bank',
  standalone: true,
  imports: [RouterLink, ScoreboardComponent, TimerComponent, AuditStripComponent],
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
  /** Per-round unbanked chain (display-only; 1 by default, 0 right after a miss). */
  readonly chains = signal<number[]>(freshChains());
  /** Per-round banked amount, for the round-history strip. */
  readonly banked = signal<number[]>(freshBanked());
  readonly revealed = signal<Set<number>>(new Set());
  readonly audit = signal<AuditEntry[]>([]);
  readonly msg = signal('');
  private seq = 0;

  readonly rounds = Array.from({ length: BANK_ROUNDS }, (_, i) => i);
  readonly ladder = BANK_CHAIN_STEPS;
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
        this.revealed.set(new Set());
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
    this.timer()?.reset();
  }

  next(): void {
    this.idx.update((i) => Math.min(BANK_ROUNDS - 1, i + 1));
    this.timer()?.reset();
  }

  go(i: number): void {
    this.idx.set(i);
    this.timer()?.reset();
  }

  toggle(id: number): void {
    this.revealed.update((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  /** Doubles the round's displayed chain; a Correct on a wiped chain restarts it. */
  correct(): void {
    this.setChain((c) => (c <= 0 ? 1 : Math.min(BANK_CHAIN_MAX, c * 2)));
  }

  /** Miss zeroes the unbanked chain — the site never wipes it on its own. */
  miss(): void {
    this.setChain(() => 0);
  }

  /** The only tap that writes points: banks the chain, then resets it to 1. */
  bank(): void {
    const i = this.idx();
    const amount = this.chainOf(i);
    const team = this.teamOfRound(i);
    if (!team || amount <= 0) return;
    this.applyScore(team, amount, `بنك الدور ${i + 1}`);
    this.banked.update((bs) => {
      const next = [...bs];
      next[i] = (next[i] ?? 0) + amount;
      return next;
    });
    this.chains.update((cs) => {
      const next = [...cs];
      next[i] = 1;
      return next;
    });
  }

  /** Fresh game: re-gate the start team, clear every tally, draw 72 again. */
  newGame(): void {
    this.startTeam.set(null);
    this.idx.set(0);
    this.chains.set(freshChains());
    this.banked.set(freshBanked());
    this.revealed.set(new Set());
    this.audit.set([]);
    this.scoreA.set(0);
    this.scoreB.set(0);
    this.seq = 0;
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

  /** Applies delta directly (scores may go negative); audits the actual
   * amount, so the strip always sums to the score. Returns the delta. */
  private applyScore(team: BankTeam, delta: number, label: string): number {
    if (delta === 0) return 0;
    if (team === 'A') this.scoreA.update((v) => v + delta);
    else this.scoreB.update((v) => v + delta);
    this.audit.update((es) => [...es.slice(-49), { seq: ++this.seq, team, label, delta }]);
    return delta;
  }
}
