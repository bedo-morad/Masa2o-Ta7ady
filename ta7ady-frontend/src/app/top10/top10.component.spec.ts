import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import {
  Top10Component,
  rankValue,
  teamContribution,
  trioHolder,
} from './top10.component';
import { Top10List } from '../api.service';

describe('rankValue', () => {
  it('ranks 1-10 score their rank', () => {
    expect(rankValue(1)).toBe(1);
    expect(rankValue(5)).toBe(5);
    expect(rankValue(10)).toBe(10);
  });

  it('ranks 11/12/13 score negative', () => {
    expect(rankValue(11)).toBe(-1);
    expect(rankValue(12)).toBe(-2);
    expect(rankValue(13)).toBe(-3);
  });
});

describe('trioHolder + teamContribution', () => {
  it('no trio without all three negative ranks', () => {
    expect(trioHolder({ 11: 'A', 12: 'A' })).toBeNull();
    expect(trioHolder({ 11: 'A', 12: 'A', 13: 'B' })).toBeNull();
  });

  it('holding 11+12+13 flips the trio to +6', () => {
    const m = { 11: 'A', 12: 'A', 13: 'A' } as const;
    expect(trioHolder(m)).toBe('A');
    expect(teamContribution(m, 'A')).toBe(6);
    expect(teamContribution(m, 'B')).toBe(0);
  });

  it('trio bonus stacks with positive ranks', () => {
    const m = { 10: 'B', 11: 'B', 12: 'B', 13: 'B' } as const;
    expect(teamContribution(m, 'B')).toBe(16);
  });

  it('split negatives score naive values only', () => {
    const m = { 11: 'A', 12: 'B', 13: 'A' } as const;
    expect(teamContribution(m, 'A')).toBe(-4);
    expect(teamContribution(m, 'B')).toBe(-2);
  });
});

describe('Top10Component', () => {
  const list = (id: number): Top10List => ({
    id,
    prompt: 'قائمة',
    answers: Array.from({ length: 13 }, (_, i) => `جواب ${i + 1}`),
  });

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Top10Component],
      providers: [provideHttpClient(), provideRouter([])],
    }).compileComponents();
  });

  function setup(): Top10Component {
    const fixture = TestBed.createComponent(Top10Component);
    fixture.detectChanges();
    const c = fixture.componentInstance;
    c.lists.set([list(1)]);
    return c;
  }

  function assign(c: Top10Component, id: number, rank: number, team: 'A' | 'B'): void {
    const from = c.assigned(id, rank);
    c.onAssign(list(id), rank, {
      label: '',
      points: 0,
      picked: team,
      from,
      to: from === team ? null : team,
    });
  }

  it('creates', () => {
    expect(setup()).toBeTruthy();
  });

  it('assigning a rank adds its value to that team', () => {
    const c = setup();
    assign(c, 1, 10, 'A');
    expect(c.scoreA()).toBe(10);
    expect(c.scoreB()).toBe(0);
  });

  it('negative ranks subtract below zero', () => {
    const c = setup();
    assign(c, 1, 10, 'B');
    assign(c, 1, 13, 'B');
    expect(c.scoreB()).toBe(7);
    assign(c, 1, 10, 'B'); // unassign rank 10
    expect(c.scoreB()).toBe(-3); // 7 - 10 lands negative
    expect(c.audit().map((e) => e.delta)).toEqual([10, -3, -10]);
  });

  it('completing 11+12+13 flips the trio to +6', () => {
    const c = setup();
    assign(c, 1, 10, 'A');
    assign(c, 1, 11, 'A');
    assign(c, 1, 12, 'A');
    expect(c.scoreA()).toBe(7); // 10 - 1 - 2
    assign(c, 1, 13, 'A');
    expect(c.scoreA()).toBe(16); // 10 + 6
  });

  it('completing 11+12+13 from zero scores exactly +6', () => {
    const c = setup();
    assign(c, 1, 11, 'B');
    assign(c, 1, 12, 'B');
    expect(c.scoreB()).toBe(-3); // negatives book in full now
    assign(c, 1, 13, 'B');
    expect(c.scoreB()).toBe(6); // trio flips to +6, per RULES.md
    expect(c.audit().map((e) => e.delta)).toEqual([-1, -2, 9]);
  });

  it('unassigning one trio rank reverses the flip exactly', () => {
    const c = setup();
    assign(c, 1, 11, 'B');
    assign(c, 1, 12, 'B');
    assign(c, 1, 13, 'B');
    expect(c.scoreB()).toBe(6);
    assign(c, 1, 12, 'B'); // unassign
    expect(c.scoreB()).toBe(-4);
    expect(c.audit().map((e) => e.delta)).toEqual([-1, -2, 9, -10]);
    expect(c.assigned(1, 12)).toBeNull();
  });

  it('unassigning a positive rank reverses exactly', () => {
    const c = setup();
    assign(c, 1, 7, 'A');
    assign(c, 1, 7, 'A');
    expect(c.scoreA()).toBe(0);
    expect(c.assigned(1, 7)).toBeNull();
  });

  it('switching a rank moves points between teams', () => {
    const c = setup();
    assign(c, 1, 5, 'A');
    assign(c, 1, 5, 'B');
    expect(c.scoreA()).toBe(0);
    expect(c.scoreB()).toBe(5);
    expect(c.assigned(1, 5)).toBe('B');
  });

  it('every tap appends an audit entry', () => {
    const c = setup();
    assign(c, 1, 3, 'A');
    expect(c.audit().length).toBe(1);
    expect(c.audit()[0]).toEqual(
      expect.objectContaining({ team: 'A', label: 'جواب 3', delta: 3 }),
    );
  });

  it('navigation stays in bounds', () => {
    const c = setup();
    c.lists.set([list(1), list(2)]);
    c.next();
    expect(c.idx()).toBe(1);
    c.next();
    expect(c.idx()).toBe(1);
    c.prev();
    expect(c.idx()).toBe(0);
  });

  it('dead-turn tracker flags a hint at 3 and resets', () => {
    const c = setup();
    expect(c.hintDue(1)).toBe(false);
    c.bumpDead(1, 1);
    c.bumpDead(1, 1);
    expect(c.hintDue(1)).toBe(false);
    c.bumpDead(1, 1);
    expect(c.deadOf(1)).toBe(3);
    expect(c.hintDue(1)).toBe(true);
    c.bumpDead(1, -1);
    expect(c.hintDue(1)).toBe(false);
    c.resetDead(1);
    expect(c.deadOf(1)).toBe(0);
  });

  it('dead turns never go below zero', () => {
    const c = setup();
    c.bumpDead(1, -1);
    expect(c.deadOf(1)).toBe(0);
  });
});
