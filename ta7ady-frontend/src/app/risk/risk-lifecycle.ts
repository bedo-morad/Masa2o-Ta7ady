import { signal, WritableSignal } from '@angular/core';
import { RiskPack } from '../api.service';
import { AssignedTeam, AuditEntry } from '../shared/attribution/attribution.component';
import { ScoreBooking } from '../shared/score-booking';

export const RISK_TIERS = [5, 10, 20, 40] as const;

export function tierPoints(tier: number): number { return RISK_TIERS[tier] ?? 0; }
export function pointValue(tier: number, doubled: boolean): number { return tierPoints(tier) * (doubled ? 2 : 1); }
export function cellKey(packId: number, tier: number): string { return `${packId}:${tier}`; }
export function splitCell(key: string): { packId: number; tier: number } {
  const [packId, tier] = key.split(':');
  return { packId: Number(packId), tier: Number(tier) };
}
export function chooseUniform<T>(items: readonly T[], rand: () => number = Math.random): T | null {
  if (!items.length) return null;
  const index = Math.min(items.length - 1, Math.max(0, Math.floor(rand() * items.length)));
  return items[index];
}

type CardState = { A: boolean[]; B: boolean[] };

/** Owns Risk's coupled board state and synchronous transitions; the page owns loading and policy. */
export class RiskLifecycle {
  readonly packs = signal<RiskPack[]>([]);
  readonly seen = signal<Set<string>>(new Set());
  readonly open = signal<string | null>(null);
  readonly double = signal<string | null>(null);
  readonly assignments = signal<Record<string, AssignedTeam>>({});
  readonly cards = signal<CardState>(this.emptyCards());

  constructor(private readonly booking: ScoreBooking) {}

  loadBoard(rows: RiskPack[]): void {
    for (const old of this.packs()) this.reversePack(old);
    this.packs.set(rows);
    this.seen.set(new Set());
    this.open.set(null);
    this.assignments.set({});
    this.cards.set(this.emptyCards());
    this.hideDouble(rows, new Set());
  }

  replaceColumn(col: number, fresh: RiskPack): void {
    const found = this.doubleFound();
    const old = this.packs()[col];
    const revealed = new Set(this.seen());
    if (old) {
      this.reversePack(old);
      old.questions.forEach((_, tier) => revealed.delete(cellKey(old.id, tier)));
    }
    this.packs.update((packs) => packs.map((current, index) => index === col ? fresh : current));
    this.seen.set(revealed);
    if (old && this.packIdOf(this.open()) === old.id) this.open.set(null);
    if (found) {
      const current = this.double();
      if (current && !this.cellExists(current)) this.double.set(null);
    } else {
      this.hideDouble(this.packs(), revealed);
    }
  }

  toggleCell(key: string): void {
    if (this.open() === key) { this.open.set(null); return; }
    this.open.set(key);
    if (!this.seen().has(key)) {
      this.seen.update((current) => { const next = new Set(current); next.add(key); return next; });
    }
  }

  setAssignment(key: string, team: AssignedTeam): void {
    this.assignments.update((current) => {
      const next = { ...current };
      if (team) next[key] = team; else delete next[key];
      return next;
    });
  }

  toggleCard(team: 'A' | 'B', index: number): void {
    this.cards.update((current) => {
      const values = [...current[team]];
      values[index] = !values[index];
      return { ...current, [team]: values };
    });
  }

  doubleFound(): boolean {
    const current = this.double();
    return current !== null && this.seen().has(current);
  }

  private reversePack(pack: RiskPack): void {
    const remaining = { ...this.assignments() };
    pack.questions.forEach((question, tier) => {
      const key = cellKey(pack.id, tier);
      const team = remaining[key] ?? null;
      delete remaining[key];
      if (team) this.booking.book(team, -pointValue(tier, this.double() === key), question.question);
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

  private packIdOf(key: string | null): number | null { return key ? splitCell(key).packId : null; }
  private emptyCards(): CardState { return { A: [false, false, false, false], B: [false, false, false, false] }; }
}
