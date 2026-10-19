import { WritableSignal } from '@angular/core';
import { AuditEntry } from './attribution/attribution.component';

/** The invariant score side effect shared by game-owned scoring policies. */
export class ScoreBooking {
  private sequence = 0;

  constructor(
    private readonly scoreA: WritableSignal<number>,
    private readonly scoreB: WritableSignal<number>,
    private readonly audit: WritableSignal<AuditEntry[]>,
  ) {}

  book(team: 'A' | 'B', delta: number, label: string): number {
    if (delta === 0) return 0;
    const score = team === 'A' ? this.scoreA : this.scoreB;
    score.update((value) => value + delta);
    this.audit.update((entries) => [
      ...entries.slice(-49),
      { seq: ++this.sequence, team, label, delta },
    ]);
    return delta;
  }

  resetSequence(): void {
    this.sequence = 0;
  }
}
