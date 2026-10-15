import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import {
  RISK_TIERS,
  RiskComponent,
  cellKey,
  chooseUniform,
  pointValue,
  splitCell,
  tierPoints,
} from './risk.component';
import { ApiService, RiskPack } from '../api.service';

describe('risk helpers', () => {
  it('tiers follow 5/10/20/40', () => {
    expect(RISK_TIERS).toEqual([5, 10, 20, 40]);
    expect([0, 1, 2, 3].map(tierPoints)).toEqual([5, 10, 20, 40]);
    expect(tierPoints(4)).toBe(0); // out of range
  });

  it('pointValue doubles only when the cell is the double', () => {
    expect(pointValue(0, false)).toBe(5);
    expect(pointValue(0, true)).toBe(10);
    expect(pointValue(3, false)).toBe(40);
    expect(pointValue(3, true)).toBe(80);
  });

  it('cellKey / splitCell round-trip', () => {
    expect(cellKey(7, 2)).toBe('7:2');
    expect(splitCell('7:2')).toEqual({ packId: 7, tier: 2 });
  });

  it('chooseUniform picks over the whole range, clamps, and handles empty', () => {
    const items = ['a', 'b', 'c', 'd'];
    expect(chooseUniform(items, () => 0)).toBe('a');
    expect(chooseUniform(items, () => 0.26)).toBe('b');
    expect(chooseUniform(items, () => 0.99)).toBe('d');
    expect(chooseUniform(items, () => 1)).toBe('d'); // clamped, never out of bounds
    expect(chooseUniform([], () => 0)).toBeNull();
  });
});

describe('RiskComponent', () => {
  const pack = (id: number, genre = 'مجموعة'): RiskPack => ({
    id,
    genre,
    questions: [5, 10, 20, 40].map((points, i) => ({
      points,
      question: `سؤال ${i}`,
      answer: `جواب ${i}`,
    })),
  });
  const board = (): RiskPack[] => [pack(1), pack(2), pack(3), pack(4)];

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [RiskComponent],
      providers: [provideHttpClient(), provideRouter([])],
    }).compileComponents();
  });

  function setup(): RiskComponent {
    const fixture = TestBed.createComponent(RiskComponent);
    fixture.detectChanges();
    const c = fixture.componentInstance;
    c.loadBoard(board());
    return c;
  }

  function cellsOf(c: RiskComponent): string[] {
    return c.packs().flatMap((p) => p.questions.map((_, t) => cellKey(p.id, t)));
  }

  function assign(c: RiskComponent, key: string, team: 'A' | 'B'): void {
    const from = c.assigned(key);
    c.onAssign(key, 'q', {
      label: 'q',
      points: c.pointsOf(key),
      picked: team,
      from,
      to: from === team ? null : team,
    });
  }

  it('creates', () => {
    expect(setup()).toBeTruthy();
  });

  it('hides exactly one double among the 16 cells', () => {
    const c = setup();
    const d = c.double();
    expect(d).not.toBeNull();
    expect(cellsOf(c)).toContain(d as string);
  });

  it('never shows the double badge before its cell is revealed', () => {
    const c = setup();
    const d = c.double() as string;
    const other = cellsOf(c).find((k) => k !== d) as string;
    expect(c.isDouble(d)).toBe(false);
    expect(c.isDouble(other)).toBe(false);

    c.toggleCell(other);
    expect(c.isDouble(other)).toBe(false);

    c.toggleCell(d);
    expect(c.isDouble(d)).toBe(true);
  });

  it('attribution scores face value and unassign reverses exactly', () => {
    const c = setup();
    const key = cellKey(1, 0); // tier 0 = 5
    c.double.set(cellKey(4, 3)); // keep the double elsewhere
    c.toggleCell(key);
    assign(c, key, 'A');
    expect(c.scoreA()).toBe(5);
    expect(c.assigned(key)).toBe('A');
    assign(c, key, 'A'); // unassign
    expect(c.scoreA()).toBe(0);
    expect(c.assigned(key)).toBeNull();
  });

  it('doubled cell attributes face value ×2 and reverses ×2', () => {
    const c = setup();
    const key = cellKey(2, 3); // tier 3 = 40 → doubled 80
    c.double.set(key);
    c.toggleCell(key);
    expect(c.pointsOf(key)).toBe(80);
    assign(c, key, 'B');
    expect(c.scoreB()).toBe(80);
    assign(c, key, 'B');
    expect(c.scoreB()).toBe(0);
  });

  it('answered cells dim (seen) but stay tappable; closing keeps them seen', () => {
    const c = setup();
    const key = cellKey(1, 1);
    expect(c.isSeen(key)).toBe(false);
    c.toggleCell(key);
    expect(c.isOpen(key)).toBe(true);
    expect(c.isSeen(key)).toBe(true);
    c.toggleCell(key);
    expect(c.isOpen(key)).toBe(false);
    expect(c.isSeen(key)).toBe(true);
  });

  it('genre reroll swaps the column and reverses its booked points', async () => {
    const c = setup();
    const api = TestBed.inject(ApiService);
    const key = cellKey(1, 2); // column 0, tier 2 = 20
    c.double.set(cellKey(4, 3));
    c.toggleCell(key);
    assign(c, key, 'A');
    expect(c.scoreA()).toBe(20);

    vi.spyOn(api, 'riskRandom').mockReturnValue(of([pack(99, 'جانب جديد')]));
    await c.rerollColumn(0);

    expect(c.packs()[0].id).toBe(99);
    expect(c.packs()[0].genre).toBe('جانب جديد');
    expect(c.scoreA()).toBe(0); // old column's points reversed
    expect(c.isSeen(key)).toBe(false);
    expect(c.assigned(key)).toBeNull();
    expect(c.open()).toBeNull();
  });

  it('unfound double is re-hidden uniformly among the unanswered after a reroll', async () => {
    const c = setup();
    const api = TestBed.inject(ApiService);
    const answered = cellKey(2, 0); // column 1 — survives the reroll
    c.double.set(cellKey(4, 3));
    c.toggleCell(answered);
    c.toggleCell(answered); // seen, closed

    vi.spyOn(api, 'riskRandom').mockReturnValue(of([pack(99)]));
    await c.rerollColumn(0);

    const d = c.double();
    expect(d).not.toBeNull();
    expect(cellsOf(c)).toContain(d as string);
    // Re-hidden only among still-unanswered cells: never on the answered one.
    expect(c.seen().has(d as string)).toBe(false);
    expect(d).not.toBe(answered);
  });

  it('a found double is never re-hidden by a reroll', async () => {
    const c = setup();
    const api = TestBed.inject(ApiService);
    const d = c.double() as string;
    c.toggleCell(d); // reveal it → found
    expect(c.doubleFound()).toBe(true);

    const dPack = splitCell(d).packId;
    const col = c.packs().findIndex((p) => p.id !== dPack); // reroll a different column
    vi.spyOn(api, 'riskRandom').mockReturnValue(of([pack(99)]));
    await c.rerollColumn(col);

    expect(c.double()).toBe(d); // no new double hidden
    expect(c.doubleFound()).toBe(true);
  });

  it('rerolling away a found double leaves no hidden double', async () => {
    const c = setup();
    const api = TestBed.inject(ApiService);
    const d = c.double() as string;
    c.toggleCell(d);
    const col = c.packs().findIndex((p) => p.id === splitCell(d).packId);

    vi.spyOn(api, 'riskRandom').mockReturnValue(of([pack(99)]));
    await c.rerollColumn(col);

    expect(c.double()).toBeNull();
    expect(c.doubleFound()).toBe(false);
  });

  it('new board reverses the outgoing board and re-hides a fresh double', () => {
    const c = setup();
    const key = cellKey(1, 1); // tier 1 = 10
    c.double.set(cellKey(4, 3));
    c.toggleCell(key);
    assign(c, key, 'A');
    expect(c.scoreA()).toBe(10);

    c.loadBoard([pack(5), pack(6), pack(7), pack(8)]);
    expect(c.scoreA()).toBe(0);
    expect(c.audit().at(-1)).toEqual(expect.objectContaining({ team: 'A', delta: -10 }));
    expect(c.seen().size).toBe(0);
    expect(c.open()).toBeNull();
    expect(c.double()).not.toBeNull();
  });

  it('card tracker toggles used/unused and stays out of the audit strip', () => {
    const c = setup();
    const auditLen = c.audit().length;
    expect(c.cardUsed('A', 0)).toBe(false);
    c.toggleCard('A', 0);
    expect(c.cardUsed('A', 0)).toBe(true);
    c.toggleCard('A', 0);
    expect(c.cardUsed('A', 0)).toBe(false);
    c.toggleCard('B', 3);
    expect(c.cardUsed('B', 3)).toBe(true);
    expect(c.cardUsed('A', 0)).toBe(false);
    expect(c.audit().length).toBe(auditLen); // display-only: no audit entries
  });

  it('cards reset on a new board', () => {
    const c = setup();
    c.toggleCard('A', 0);
    c.toggleCard('B', 2);
    expect(c.cardUsed('A', 0)).toBe(true);

    c.loadBoard([pack(5), pack(6), pack(7), pack(8)]);
    expect(c.cards()).toEqual({ A: [false, false, false, false], B: [false, false, false, false] });
  });
});
