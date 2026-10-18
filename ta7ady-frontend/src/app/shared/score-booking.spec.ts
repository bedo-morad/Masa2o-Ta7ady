import { signal } from '@angular/core';
import { ScoreBooking } from './score-booking';
import { AuditEntry } from './attribution/attribution.component';

describe('ScoreBooking', () => {
  it('books signed non-zero deltas with exact audit data, caps history, and keeps sequence monotonic', () => {
    const scoreA = signal(0);
    const scoreB = signal(0);
    const audit = signal<AuditEntry[]>([]);
    const booking = new ScoreBooking(scoreA, scoreB, audit);

    expect(booking.book('A', 0, 'ignored')).toBe(0);
    expect(audit()).toEqual([]);
    expect(booking.book('A', -3, 'reversal')).toBe(-3);
    expect(booking.book('B', 5, 'bank')).toBe(5);
    for (let i = 0; i < 50; i += 1) booking.book('A', 1, `label-${i}`);

    expect(scoreA()).toBe(47);
    expect(scoreB()).toBe(5);
    expect(audit()).toHaveLength(50);
    expect(audit()[0]).toEqual({ seq: 3, team: 'A', label: 'label-0', delta: 1 });
    expect(audit().at(-1)).toEqual({ seq: 52, team: 'A', label: 'label-49', delta: 1 });
  });
});
