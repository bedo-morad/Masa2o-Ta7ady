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

  function pick(c: ScoresheetComponent, side: 'A' | 'B', index: number, player?: string): void {
    const m = match(1);
    const list = side === 'A' ? m.lineupA : m.lineupB;
    c.onToggle(m, side, index, player ?? list[index]);
  }

  it('creates with count defaulting to 1', () => {
    const c = setup();
    expect(c).toBeTruthy();
    expect(c.count()).toBe(1);
  });

  it('tapping a player adds exactly 1 point to the column team', () => {
    const c = setup();
    pick(c, 'A', 0);
    pick(c, 'B', 5);
    expect(c.scoreA()).toBe(1);
    expect(c.scoreB()).toBe(1);
  });

  it('tapping again unassigns and reverses exactly', () => {
    const c = setup();
    pick(c, 'A', 0);
    pick(c, 'A', 0);
    expect(c.scoreA()).toBe(0);
    expect(c.assigned(1, 'A:0')).toBeNull();
  });

  it('side lock: column A scores for team A, column B for team B', () => {
    const c = setup();
    pick(c, 'A', 2);
    expect(c.scoreA()).toBe(1);
    expect(c.scoreB()).toBe(0);
    expect(c.assigned(1, 'A:2')).toBe('A');
    pick(c, 'B', 2);
    expect(c.scoreA()).toBe(1);
    expect(c.scoreB()).toBe(1);
    expect(c.assigned(1, 'B:2')).toBe('B');
  });

  it('unassigning below zero lands negative and audits the real delta', () => {
    const c = setup();
    pick(c, 'A', 0);
    c.scoreA.set(0); // referee manually zeroed after an attribution
    pick(c, 'A', 0); // unassign reverses -1
    expect(c.scoreA()).toBe(-1);
    expect(c.audit().at(-1)).toEqual(expect.objectContaining({ team: 'A', delta: -1 }));
  });

  it('every tap appends an audit entry', () => {
    const c = setup();
    pick(c, 'B', 3);
    expect(c.audit().length).toBe(1);
    expect(c.audit()[0]).toEqual(
      expect.objectContaining({ team: 'B', delta: 1 }),
    );
  });

  it('strike tracker: 3 mistakes eliminates, reset clears', () => {
    const c = setup();
    const m = match(1);
    expect(c.slotsOf(m).length).toBe(4);
    expect(c.isOut(c.slotsOf(m)[0])).toBe(false);
    c.bumpMistake(1, 0, 1);
    c.bumpMistake(1, 0, 1);
    expect(c.isOut(c.slotsOf(m)[0])).toBe(false);
    c.bumpMistake(1, 0, 1);
    expect(c.slotsOf(m)[0].mistakes).toBe(3);
    expect(c.isOut(c.slotsOf(m)[0])).toBe(true);
    expect(c.isOut(c.slotsOf(m)[1])).toBe(false);
    c.resetSlot(1, 0);
    expect(c.isOut(c.slotsOf(m)[0])).toBe(false);
  });

  it('strike slots default to the team names and stay editable', () => {
    const c = setup();
    const m = match(1);
    c.teamA.set('الصقور');
    c.teamB.set('النمور');
    // drop any cached slots so defaults rebuild from the team names
    c.strikes.set({});
    expect(c.slotsOf(m)[0].name).toContain('الصقور');
    expect(c.slotsOf(m)[2].name).toContain('النمور');
    c.setSlotName(1, 0, 'كابتن');
    expect(c.slotsOf(m)[0].name).toBe('كابتن');
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
