import { signal, WritableSignal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiService, RiskPack, RiskQuestion } from '../api.service';
import {
  AssignedTeam,
  AttributionChange,
  AuditEntry,
  attributionDeltas,
} from '../shared/attribution/attribution.component';
import { ScoreBooking } from '../shared/score-booking';

export const RISK_TIERS = [5, 10, 20, 40] as const;

export function tierPoints(tier: number): number {
  return RISK_TIERS[tier] ?? 0;
}

export function pointValue(tier: number, doubled: boolean): number {
  return tierPoints(tier) * (doubled ? 2 : 1);
}

export function cellKey(packId: number, tier: number): string {
  return `${packId}:${tier}`;
}

export function splitCell(key: string): { packId: number; tier: number } {
  const [packId, tier] = key.split(':');
  return { packId: Number(packId), tier: Number(tier) };
}

export function chooseUniform<T>(items: readonly T[], rand: () => number = Math.random): T | null {
  if (!items.length) return null;
  const index = Math.min(items.length - 1, Math.max(0, Math.floor(rand() * items.length)));
  return items[index];
}

/** Owns Risk's coupled board transitions; loading and rendering remain on the page. */
export class RiskLifecycle {
  readonly packs = signal<RiskPack[]>([]);
  readonly seen = signal<Set<string>>(new Set());
  readonly open = signal<string | null>(null);
  readonly double = signal<string | null>(null);
  readonly assignments = signal<Record<string, AssignedTeam>>({});
  readonly cards = signal<{ A: boolean[]; B: boolean[] }>(this.emptyCards());
  readonly rerolling = signal<number | null>(null);

  private readonly booking: ScoreBooking;

  constructor(
    private readonly api: ApiService,
    scoreA: WritableSignal<number>,
    scoreB: WritableSignal<number>,
    audit: WritableSignal<AuditEntry[]>,
  ) {
    this.booking = new ScoreBooking(scoreA, scoreB, audit);
  }

  loadBoard(rows: RiskPack[]): void {
    for (const old of this.packs()) this.reversePack(old);
    this.packs.set(rows);
    this.seen.set(new Set());
    this.open.set(null);
    this.assignments.set({});
    this.cards.set(this.emptyCards());
    this.hideDouble(rows, new Set());
  }

  cellAt(key: string | null): RiskQuestion | null {
    if (!key) return null;
    const { packId, tier } = splitCell(key);
    const pack = this.packs().find((candidate) => candidate.id === packId);
    return pack?.questions[tier] ?? null;
  }

  genreOf(key: string): string {
    const { packId } = splitCell(key);
    return this.packs().find((pack) => pack.id === packId)?.genre ?? '';
  }

  tierOf(key: string): number {
    return splitCell(key).tier;
  }

  isSeen(key: string): boolean {
    return this.seen().has(key);
  }

  isOpen(key: string): boolean {
    return this.open() === key;
  }

  isDouble(key: string): boolean {
    return this.double() === key && this.seen().has(key);
  }

  toggleCell(key: string): void {
    if (this.open() === key) {
      this.open.set(null);
      return;
    }
    this.open.set(key);
    if (!this.seen().has(key)) {
      this.seen.update((current) => {
        const next = new Set(current);
        next.add(key);
        return next;
      });
    }
  }

  assigned(key: string): AssignedTeam {
    return this.assignments()[key] ?? null;
  }

  pointsOf(key: string): number {
    return pointValue(this.tierOf(key), this.double() === key);
  }

  assign(key: string, label: string, change: AttributionChange): void {
    const from = this.assignments()[key] ?? null;
    const to: AssignedTeam = from === change.picked ? null : change.picked;
    const points = this.pointsOf(key);
    const { deltaA, deltaB } = attributionDeltas(points, from, to);
    this.booking.book('A', deltaA, label);
    this.booking.book('B', deltaB, label);
    this.assignments.update((current) => {
      const next = { ...current };
      if (to) next[key] = to;
      else delete next[key];
      return next;
    });
  }

  doubleFound(): boolean {
    const current = this.double();
    return current !== null && this.seen().has(current);
  }

  async rerollColumn(col: number): Promise<void> {
    if (this.rerolling() !== null) return;
    this.rerolling.set(col);
    try {
      const fresh = await firstValueFrom(this.api.riskRandom(1));
      const pack = fresh[0];
      if (!pack) throw new Error('empty');

      // Capture before clearing the old column: a found Double stays found.
      const found = this.doubleFound();
      const old = this.packs()[col];
      if (old) this.reversePack(old);
      const revealed = new Set(this.seen());
      if (old) {
        old.questions.forEach((_, tier) => revealed.delete(cellKey(old.id, tier)));
      }
      this.packs.update((packs) => packs.map((current, index) => (index === col ? pack : current)));
      this.seen.set(revealed);
      if (old && this.splitOf(this.open()) === old.id) this.open.set(null);
      if (found) {
        const current = this.double();
        if (current && !this.cellExists(current)) this.double.set(null);
      } else {
        this.hideDouble(this.packs(), revealed);
      }
    } catch {
      throw new Error('risk reroll failed');
    } finally {
      this.rerolling.set(null);
    }
  }

  cardUsed(team: 'A' | 'B', index: number): boolean {
    return this.cards()[team][index];
  }

  toggleCard(team: 'A' | 'B', index: number): void {
    this.cards.update((current) => {
      const values = [...current[team]];
      values[index] = !values[index];
      return { ...current, [team]: values };
    });
  }

  private reversePack(pack: RiskPack): void {
    const remaining = { ...this.assignments() };
    pack.questions.forEach((question, tier) => {
      const key = cellKey(pack.id, tier);
      const team = remaining[key] ?? null;
      delete remaining[key];
      if (team) this.booking.book(team, -this.pointsOf(key), question.question);
    });
    this.assignments.set(remaining);
  }

  private hideDouble(packs: RiskPack[], revealed: Set<string>): void {
    const cells: string[] = [];
    for (const pack of packs) {
      pack.questions.forEach((_, tier) => {
        const key = cellKey(pack.id, tier);
        if (!revealed.has(key)) cells.push(key);
      });
    }
    this.double.set(chooseUniform(cells));
  }

  private cellExists(key: string): boolean {
    const { packId, tier } = splitCell(key);
    const pack = this.packs().find((candidate) => candidate.id === packId);
    return !!pack && tier >= 0 && tier < pack.questions.length;
  }

  private splitOf(key: string | null): number | null {
    return key ? splitCell(key).packId : null;
  }

  private emptyCards(): { A: boolean[]; B: boolean[] } {
    return { A: [false, false, false, false], B: [false, false, false, false] };
  }
}
