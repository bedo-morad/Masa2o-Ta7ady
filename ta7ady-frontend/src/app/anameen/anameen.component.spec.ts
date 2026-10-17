import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';
import {
  ANAMEEN_CLUES,
  ANAMEEN_COUNTS,
  ANAMEEN_COUNT_DEFAULT,
  ANAMEEN_POINTS,
  AnameenTeam,
  canReveal,
  nextReveal,
} from './anameen.game';
import { AnameenComponent } from './anameen.component';
import { AnameenSubject, ApiService } from '../api.service';
import { AttributionChange } from '../shared/attribution/attribution.component';

const subject = (id: number): AnameenSubject => ({
  id,
  player: `لاعب ${id}`,
  clues: Array.from({ length: ANAMEEN_CLUES }, (_, k) => `دليل ${k + 1}`),
});

describe('anameen helpers + shape', () => {
  it('opens clues 1→5 hard→easy: +1 each, hard stop at 5', () => {
    expect(nextReveal(1)).toBe(2);
    expect(nextReveal(4)).toBe(5);
    expect(nextReveal(5)).toBe(5);
    for (let k = 1; k < ANAMEEN_CLUES; k++) expect(canReveal(k)).toBe(true);
    expect(canReveal(ANAMEEN_CLUES)).toBe(false);
  });

  it('fixes the game shape: 5 clues, +1 flat, count gate 1/3/5/10 default 3', () => {
    expect(ANAMEEN_CLUES).toBe(5);
    expect(ANAMEEN_POINTS).toBe(1);
    expect(ANAMEEN_COUNTS).toEqual([1, 3, 5, 10]);
    expect(ANAMEEN_COUNT_DEFAULT).toBe(3);
  });
});

describe('AnameenComponent', () => {
  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [AnameenComponent],
      providers: [provideHttpClient(), provideRouter([])],
    }).compileComponents();
  });

  function setup(): { fixture: ComponentFixture<AnameenComponent>; c: AnameenComponent } {
    const fixture = TestBed.createComponent(AnameenComponent);
    fixture.detectChanges();
    const c = fixture.componentInstance;
    c.subjects.set([subject(1), subject(2), subject(3)]);
    c.pickStart('A');
    fixture.detectChanges();
    return { fixture, c };
  }

  /** The change event the shared attribution emits for one tap, per §2.3. */
  function tap(c: AnameenComponent, picked: AnameenTeam): AttributionChange {
    const s = c.current();
    if (!s) throw new Error('no subject drawn');
    const from = c.assigned(s.id);
    return {
      label: s.player,
      points: ANAMEEN_POINTS,
      picked,
      from,
      to: from === picked ? null : picked,
    };
  }

  it('creates gated with no start team and clue 1 already open', () => {
    const c = TestBed.createComponent(AnameenComponent).componentInstance;
    expect(c.startTeam()).toBeNull();
    expect(c.teamOf(0)).toBeNull();
    c.subjects.set([subject(1)]);
    expect(c.openedOf(1)).toBe(1);
    expect(c.canOpenMore(c.current() as AnameenSubject)).toBe(true);
  });

  it('rejects counts outside the 1/3/5/10 gate and resets the cursor on a change', () => {
    const c = TestBed.createComponent(AnameenComponent).componentInstance;
    c.subjects.set([subject(1), subject(2), subject(3), subject(4)]);
    c.go(1);
    c.setCount(7);
    expect(c.count()).toBe(3);
    c.setCount(5);
    expect(c.count()).toBe(5);
    expect(c.idx()).toBe(0);
  });

  it('referee tap opens the next clue and puts a fresh clock behind it', () => {
    const { c } = setup();
    const timer = c.timer();
    if (!timer) throw new Error('timer not rendered');
    timer.start();
    c.revealNext();
    expect(c.openedOf(1)).toBe(2);
    expect(timer.running()).toBe(false);
    expect(timer.remaining()).toBe(timer.total());
    expect(timer.expired()).toBe(false);
  });

  it('clue progression caps at five: the file is complete, nothing more opens', () => {
    const { c } = setup();
    const timer = c.timer();
    if (!timer) throw new Error('timer not rendered');
    for (let k = 0; k < 4; k++) c.revealNext();
    expect(c.openedOf(1)).toBe(5);
    const wasRunning = timer.running();
    c.revealNext(); // no sixth clue exists
    expect(c.openedOf(1)).toBe(5);
    expect(timer.running()).toBe(wasRunning);
    expect(c.canOpenMore(c.current() as AnameenSubject)).toBe(false);
  });

  it('a clock timeout opens the next clue exactly once, then the referee acts', () => {
    const { fixture, c } = setup();
    const timer = c.timer();
    if (!timer) throw new Error('timer not rendered');
    timer.expired.set(true);
    fixture.detectChanges();
    expect(c.openedOf(1)).toBe(2);
    expect(timer.expired()).toBe(false); // reset() rewound the 60s clock
    expect(timer.running()).toBe(false); // beep-only: the referee re-arms it

    for (let k = 0; k < 4; k++) {
      timer.expired.set(true);
      fixture.detectChanges();
    }
    expect(c.openedOf(1)).toBe(5);
    expect(timer.expired()).toBe(true); // all five open: adjudicate, then move on
  });

  it('starts on the opening team and alternates A/B across subjects', () => {
    const { c } = setup();
    expect(c.teamOf(0)).toBe('A');
    expect(c.teamOf(1)).toBe('B');
    expect(c.teamOf(2)).toBe('A');
    c.pickStart('B');
    expect(c.teamOf(0)).toBe('B');
    expect(c.teamOf(1)).toBe('A');
  });

  it('scores +1 flat whichever clue cracked the player, and audits it', () => {
    const { c } = setup();
    for (let k = 0; k < 2; k++) c.revealNext(); // solved on clue 3
    c.onAssign(tap(c, 'A'));
    expect(c.scoreA()).toBe(1);
    expect(c.assigned(1)).toBe('A');
    expect(c.audit().at(-1)).toEqual(
      expect.objectContaining({ team: 'A', delta: 1, label: 'لاعب 1' }),
    );
  });

  it('a second tap on the same team unassigns, reverses +1 and audits -1', () => {
    const { c } = setup();
    c.onAssign(tap(c, 'B'));
    c.onAssign(tap(c, 'B'));
    expect(c.scoreB()).toBe(0);
    expect(c.assigned(1)).toBeNull();
    expect(c.audit().map((e) => e.delta)).toEqual([1, -1]);
  });

  it('re-pointing the solve from one team to the other nets one swap', () => {
    const { c } = setup();
    c.onAssign(tap(c, 'A'));
    c.onAssign({
      label: 'لاعب 1',
      points: ANAMEEN_POINTS,
      picked: 'B',
      from: 'A',
      to: 'B',
    });
    expect(c.scoreA()).toBe(0);
    expect(c.scoreB()).toBe(1);
    expect(c.assigned(1)).toBe('B');
  });

  it('the audit strip always sums to the scoreboard', () => {
    const { c } = setup();
    c.onAssign(tap(c, 'A'));
    c.onAssign(tap(c, 'A')); // unassign
    c.go(1);
    const second = c.current() as AnameenSubject;
    c.onAssign({
      label: second.player,
      points: ANAMEEN_POINTS,
      picked: 'B',
      from: c.assigned(second.id),
      to: 'B',
    });
    expect(c.audit().reduce((s, e) => s + e.delta, 0)).toBe(1);
    expect(c.scoreA()).toBe(0);
    expect(c.scoreB()).toBe(1);
  });

  it('navigation stays in bounds and progress belongs to each subject', () => {
    const { c } = setup();
    c.go(1);
    c.revealNext();
    c.go(2);
    expect(c.idx()).toBe(2);
    c.next();
    expect(c.idx()).toBe(2);
    c.revealNext();
    c.go(0);
    expect(c.openedOf(2)).toBe(2);
    expect(c.openedOf(0)).toBe(1);
  });

  it('count redraw re-arms the draw and puts the cursor back at the top', () => {
    const { c } = setup();
    c.go(2);
    c.setCount(5);
    expect(c.count()).toBe(5);
    expect(c.idx()).toBe(0);
    c.reload();
    expect(c.idx()).toBe(0);
  });

  it('full new game re-gates the opening pick and clears every tally', () => {
    const { c } = setup();
    c.revealNext();
    c.onAssign(tap(c, 'A'));
    c.newGame();
    expect(c.startTeam()).toBeNull();
    expect(c.openedOf(1)).toBe(1);
    expect(c.assigned(1)).toBeNull();
    expect(c.scoreA()).toBe(0);
    expect(c.scoreB()).toBe(0);
    expect(c.audit().length).toBe(0);
    expect(c.idx()).toBe(0);
  });

  it('per-subject dice swaps the player and reverses its +1 with an audited -1', async () => {
    const { c } = setup();
    const api = TestBed.inject(ApiService);
    c.onAssign(tap(c, 'A'));
    vi.spyOn(api, 'anameenRandom').mockReturnValue(of([subject(99)]));
    await c.reroll(0);
    expect(c.subjects()[0].id).toBe(99);
    expect(c.assigned(99)).toBeNull();
    expect(c.scoreA()).toBe(0);
    expect(c.audit().at(-1)).toEqual(
      expect.objectContaining({ team: 'A', delta: -1, label: 'لاعب 1' }),
    );
    expect(api.anameenRandom).toHaveBeenCalledWith(1);
  });

  it('an empty dice response keeps the subject and reports the miss politely', async () => {
    const { c } = setup();
    const api = TestBed.inject(ApiService);
    vi.spyOn(api, 'anameenRandom').mockReturnValue(of([]));
    await c.reroll(0);
    expect(c.subjects()[0].id).toBe(1);
    expect(c.msg()).toContain('تعذر');
  });

  it('builds an encoded google fact-check url per player', () => {
    const { c } = setup();
    expect(c.googleUrl('من فاز بكأس 1990؟')).toBe(
      `https://www.google.com/search?q=${encodeURIComponent('من فاز بكأس 1990؟')}`,
    );
  });
});
