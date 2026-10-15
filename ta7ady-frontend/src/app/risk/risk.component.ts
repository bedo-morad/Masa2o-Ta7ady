import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { httpResource } from '@angular/common/http';
import { API_BASE, ApiService, RiskPack, RiskQuestion } from '../api.service';
import { ScoreboardComponent } from '../shared/scoreboard/scoreboard.component';
import { TimerComponent } from '../shared/timer/timer.component';
import {
  AssignedTeam,
  AttributionChange,
  AttributionComponent,
  AuditEntry,
  AuditStripComponent,
  attributionDeltas,
} from '../shared/attribution/attribution.component';

// Risk (RULES.md / SPECV3 §3.5): a fixed 4-genre × 4-tier board (5/10/20/40).
// One of the 16 cells is the hidden **double**: the device draws it uniformly at
// random among the 16 at board time — never persisted, never sent — and shows the
// referee-only badge only once that cell's own question is revealed.
// Answering is referee-judged: a correct tap attributes face value (×2 when the
// cell is the double) via the shared §2.3 pattern; a wrong answer carries no
// auto-penalty. The four per-team powers (Steal / Extra Time / Multiple Choice /
// Phone Call) are a display-only used/unused tracker — they never touch the
// audit strip and reset on a new board. No per-question dice: re-draw the board
// or reroll one genre column instead.

export const RISK_TIERS = [5, 10, 20, 40] as const; // row order == tier order
export const RISK_COUNT = 4; // one board == one draw of 4 packs
export const RISK_CARDS = ['خطف', 'وقت إضافي', 'اختيار متعدد', 'مكالمة'] as const;

/** Face value for a tier row (out of range → 0). */
export function tierPoints(tier: number): number {
  return RISK_TIERS[tier] ?? 0;
}

/** Face value, doubled when the cell is the hidden double. */
export function pointValue(tier: number, doubled: boolean): number {
  return tierPoints(tier) * (doubled ? 2 : 1);
}

export function cellKey(packId: number, tier: number): string {
  return `${packId}:${tier}`;
}

export function splitCell(key: string): { packId: number; tier: number } {
  const [p, t] = key.split(':');
  return { packId: Number(p), tier: Number(t) };
}

/** Uniform pick over `items`; `rand` is injectable so specs stay deterministic. */
export function chooseUniform<T>(
  items: readonly T[],
  rand: () => number = Math.random,
): T | null {
  if (!items.length) return null;
  const i = Math.min(items.length - 1, Math.max(0, Math.floor(rand() * items.length)));
  return items[i];
}

interface CardState {
  A: boolean[];
  B: boolean[];
}

@Component({
  selector: 'app-risk',
  standalone: true,
  imports: [
    RouterLink,
    ScoreboardComponent,
    TimerComponent,
    AttributionComponent,
    AuditStripComponent,
  ],
  templateUrl: './risk.component.html',
  styleUrl: './risk.component.scss',
})
export class RiskComponent {
  private api = inject(ApiService);

  readonly teamA = signal('');
  readonly teamB = signal('');
  readonly scoreA = signal(0);
  readonly scoreB = signal(0);
  readonly packs = signal<RiskPack[]>([]);
  /** Cells revealed at least once — the "answered" set that dims the board. */
  readonly seen = signal<Set<string>>(new Set());
  /** Cell currently in the spotlight (question + answer), or null. */
  readonly open = signal<string | null>(null);
  /** The device-only hidden double cell, or null when none is hidden. */
  readonly double = signal<string | null>(null);
  readonly assignments = signal<Record<string, AssignedTeam>>({});
  readonly cards = signal<CardState>({ A: [false, false, false, false], B: [false, false, false, false] });
  readonly audit = signal<AuditEntry[]>([]);
  readonly msg = signal('');
  readonly rerolling = signal<number | null>(null);
  private seq = 0;

  readonly tiers = RISK_TIERS;
  readonly cardLabels = RISK_CARDS;
  readonly gridCols = computed(
    () => `repeat(${Math.max(1, this.packs().length)}, minmax(0, 1fr))`,
  );

  private readonly res = httpResource<RiskPack[]>(
    () => `${API_BASE}/risk?count=${RISK_COUNT}`,
  );
  readonly loading = this.res.isLoading;

  constructor() {
    // NOTE: loadBoard reads packs/assignments/double (for point reversal) and
    // writes them. Without untracked the effect would subscribe to those too
    // and re-trigger itself on every write (new Set/object identities + a fresh
    // random double each run) — an infinite loop that freezes the page and
    // never settles the board. Only res.value()/error() may trigger a reload.
    effect(
      () => {
        const rows = this.res.value();
        const err = this.res.error();
        untracked(() => {
          if (rows) {
            this.loadBoard(rows);
            this.msg.set(rows.length ? '' : 'لا توجد مجموعات بعد — أضف من صفحة إدارة الأسئلة.');
          }
          if (err) this.msg.set('تعذر التحميل — تأكد أن السيرفر يعمل.');
        });
      },
      { allowSignalWrites: true },
    );
  }

  // ── board ──────────────────────────────────────────────────────────────

  keyOf(packId: number, tier: number): string {
    return cellKey(packId, tier);
  }

  /** Template-facing tier value (module helpers are not visible to templates). */
  pts(tier: number): number {
    return tierPoints(tier);
  }

  /** Google fact-check link for the open question (Ihbid pattern, §3.5). */
  googleUrl(text: string): string {
    return `https://www.google.com/search?q=${encodeURIComponent(text)}`;
  }

  /** A fresh board: reverse the outgoing board's points, reset every frontend
   * layer, then re-hide the double uniformly among all 16 cells. */
  loadBoard(rows: RiskPack[]): void {
    for (const old of this.packs()) this.reversePack(old);
    this.packs.set(rows);
    this.seen.set(new Set());
    this.open.set(null);
    this.assignments.set({});
    this.cards.set({ A: [false, false, false, false], B: [false, false, false, false] });
    this.hideDouble(rows, new Set());
  }

  reload(): void {
    this.res.reload();
  }

  cellAt(key: string | null): RiskQuestion | null {
    if (!key) return null;
    const { packId, tier } = splitCell(key);
    const pack = this.packs().find((p) => p.id === packId);
    return pack?.questions[tier] ?? null;
  }

  genreOf(key: string): string {
    const { packId } = splitCell(key);
    return this.packs().find((p) => p.id === packId)?.genre ?? '';
  }

  tierOf(key: string): number {
    return splitCell(key).tier;
  }

  // ── reveal ─────────────────────────────────────────────────────────────

  isSeen(key: string): boolean {
    return this.seen().has(key);
  }

  isOpen(key: string): boolean {
    return this.open() === key;
  }

  /** The referee-only double badge: only ever true once the cell is revealed. */
  isDouble(key: string): boolean {
    return this.double() === key && this.seen().has(key);
  }

  /** Reveal a cell into the spotlight; tap again to close. First reveal marks it
   * "answered" (dimmed, still tappable for review/unassign). */
  toggleCell(key: string): void {
    if (this.open() === key) {
      this.open.set(null);
      return;
    }
    this.open.set(key);
    if (!this.seen().has(key)) {
      this.seen.update((s) => {
        const next = new Set(s);
        next.add(key);
        return next;
      });
    }
  }

  // ── scoring ────────────────────────────────────────────────────────────

  assigned(key: string): AssignedTeam {
    return this.assignments()[key] ?? null;
  }

  /** Face value with the ×2 applied when this cell is the double. */
  pointsOf(key: string): number {
    return pointValue(this.tierOf(key), this.double() === key);
  }

  onAssign(key: string, label: string, ch: AttributionChange): void {
    const from = this.assignments()[key] ?? null;
    const to: AssignedTeam = from === ch.picked ? null : ch.picked;
    const points = this.pointsOf(key);
    const { deltaA, deltaB } = attributionDeltas(points, from, to);
    this.applyScore('A', deltaA, label);
    this.applyScore('B', deltaB, label);
    this.assignments.update((m) => {
      const next = { ...m };
      if (to) next[key] = to;
      else delete next[key];
      return next;
    });
  }

  private reversePack(pack: RiskPack): void {
    const all = { ...this.assignments() };
    pack.questions.forEach((q, tier) => {
      const key = cellKey(pack.id, tier);
      const team = all[key] ?? null;
      delete all[key];
      if (team) this.applyScore(team, -this.pointsOf(key), q.question);
    });
    this.assignments.set(all);
  }

  /** Applies a delta directly (scores may go negative); audits the actual amount
   * so the strip always sums to the score. Cards never pass through here. */
  private applyScore(team: 'A' | 'B', delta: number, label: string): number {
    if (delta === 0) return 0;
    if (team === 'A') this.scoreA.update((v) => v + delta);
    else this.scoreB.update((v) => v + delta);
    this.audit.update((es) => [...es.slice(-49), { seq: ++this.seq, team, label, delta }]);
    return delta;
  }

  // ── double ─────────────────────────────────────────────────────────────

  /** True once the hidden double's own cell has been revealed (the referee
   * found it) — from then on a reroll never hides a new one. */
  doubleFound(): boolean {
    const d = this.double();
    return d !== null && this.seen().has(d);
  }

  private hideDouble(packs: RiskPack[], revealed: Set<string>): void {
    const cells: string[] = [];
    for (const p of packs) {
      p.questions.forEach((_, tier) => {
        const key = cellKey(p.id, tier);
        if (!revealed.has(key)) cells.push(key);
      });
    }
    this.double.set(chooseUniform(cells));
  }

  private cellExists(key: string): boolean {
    const { packId, tier } = splitCell(key);
    const pack = this.packs().find((p) => p.id === packId);
    return !!pack && tier >= 0 && tier < pack.questions.length;
  }

  // ── genre reroll ───────────────────────────────────────────────────────

  /** Swap one genre column for a fresh pack. Double rule (§3.5): if it was
   * already found/scored, hide no new one; otherwise re-hide uniformly among the
   * still-unanswered cells so a rerolled-away double is neither lost nor doubled. */
  async rerollColumn(col: number): Promise<void> {
    if (this.rerolling() !== null) return;
    this.rerolling.set(col);
    try {
      const fresh = await firstValueFrom(this.api.riskRandom(1));
      const pack = fresh[0];
      if (!pack) throw new Error('empty');
      // Capture "found" before the swap: clearing the rerolled column's reveals
      // would otherwise turn a found double back into "not found".
      const found = this.doubleFound();
      const old = this.packs()[col];
      if (old) this.reversePack(old);
      const revealed = new Set(this.seen());
      if (old) {
        old.questions.forEach((_, tier) => revealed.delete(cellKey(old.id, tier)));
      }
      this.packs.update((ps) => ps.map((p, i) => (i === col ? pack : p)));
      this.seen.set(revealed);
      if (old && this.splitOf(this.open()) === old.id) this.open.set(null);
      if (found) {
        const d = this.double();
        if (d && !this.cellExists(d)) this.double.set(null);
      } else {
        this.hideDouble(this.packs(), revealed);
      }
      this.msg.set('');
    } catch {
      this.msg.set('تعذر تبديل هذا الجانب — حاول مجددًا.');
    } finally {
      this.rerolling.set(null);
    }
  }

  private splitOf(key: string | null): number | null {
    return key ? splitCell(key).packId : null;
  }

  // ── cards tracker (display-only) ────────────────────────────────────────

  cardUsed(team: 'A' | 'B', i: number): boolean {
    return this.cards()[team][i];
  }

  toggleCard(team: 'A' | 'B', i: number): void {
    this.cards.update((c) => {
      const t = [...c[team]];
      t[i] = !t[i];
      return { ...c, [team]: t };
    });
  }
}
