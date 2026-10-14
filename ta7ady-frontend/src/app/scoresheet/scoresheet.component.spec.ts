import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { ScoresheetComponent, playerKey } from './scoresheet.component';
import { ScoresheetMatch } from '../api.service';

describe('playerKey', () => {
  it('separates sides and indexes', () => {
    expect(playerKey('A', 0)).toBe('A:0');
    expect(playerKey('B', 10)).toBe('B:10');
    expect(playerKey('A', 0)).not.toBe(playerKey('B', 0));
  });
});

describe('ScoresheetComponent', () => {
  const match = (id: number): ScoresheetMatch => ({
    id,
    matchLabel: 'نهائي',
    teamA: 'طرف أول',
    teamB: 'طرف ثان',
    lineupA: Array.from({ length: 11 }, (_, i) => `لاعب أ${i + 1}`),
    lineupB: Array.from({ length: 11 }, (_, i) => `لاعب ب${i + 1}`),
  });

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ScoresheetComponent],
      providers: [provideHttpClient(), provideRouter([])],
    }).compileComponents();
  });

  function setup(): ScoresheetComponent {
    const fixture = TestBed.createComponent(ScoresheetComponent);
    fixture.detectChanges();
    const c = fixture.componentInstance;
    c.matches.set([match(1)]);
    return c;
  }

  function pick(c: ScoresheetComponent, key: string, team: 'A' | 'B'): void {
    const from = c.assigned(1, key);
    c.onPick(match(1), key, key, {
      label: key,
      points: 1,
      picked: team,
      from,
      to: from === team ? null : team,
    });
  }

  it('creates with count defaulting to 1', () => {
    const c = setup();
    expect(c).toBeTruthy();
    expect(c.count()).toBe(1);
  });

  it('tapping a player adds exactly 1 point', () => {
    const c = setup();
    pick(c, 'A:0', 'A');
    pick(c, 'B:5', 'B');
    expect(c.scoreA()).toBe(1);
    expect(c.scoreB()).toBe(1);
  });

  it('tapping again unassigns and reverses exactly', () => {
    const c = setup();
    pick(c, 'A:0', 'A');
    pick(c, 'A:0', 'A');
    expect(c.scoreA()).toBe(0);
    expect(c.assigned(1, 'A:0')).toBeNull();
  });

  it('switching teams moves the point across', () => {
    const c = setup();
    pick(c, 'A:0', 'A');
    pick(c, 'A:0', 'B');
    expect(c.scoreA()).toBe(0);
    expect(c.scoreB()).toBe(1);
  });

  it('scores never go below zero', () => {
    const c = setup();
    pick(c, 'A:0', 'A');
    c.scoreA.set(0); // referee manually zeroed after an attribution
    pick(c, 'A:0', 'A'); // unassign reverses -1
    expect(c.scoreA()).toBe(0);
  });

  it('clamped reversals leave no phantom audit entries', () => {
    const c = setup();
    pick(c, 'A:0', 'A');
    c.scoreA.set(0); // referee manually zeroed after an attribution
    const before = c.audit().length;
    pick(c, 'A:0', 'A'); // unassign: -1 clamped away entirely
    expect(c.scoreA()).toBe(0);
    expect(c.audit().length).toBe(before); // nothing booked, nothing recorded
  });

  it('every tap appends an audit entry', () => {
    const c = setup();
    pick(c, 'B:3', 'B');
    expect(c.audit().length).toBe(1);
    expect(c.audit()[0]).toEqual(
      expect.objectContaining({ team: 'B', delta: 1 }),
    );
  });

  it('navigation stays in bounds', () => {
    const c = setup();
    c.matches.set([match(1), match(2)]);
    c.next();
    expect(c.idx()).toBe(1);
    c.next();
    expect(c.idx()).toBe(1);
    expect(c.current()?.id).toBe(2);
    c.prev();
    expect(c.idx()).toBe(0);
  });
});
