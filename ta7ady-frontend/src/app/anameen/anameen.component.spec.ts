import { TestBed } from '@angular/core/testing';
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
} from './anameen.game';
import { AnameenComponent } from './anameen.component';
import { AnameenSubject, ApiService } from '../services/api.service';
import { AttributionChange } from '../shared/attribution/attribution.component';

const subject = (id: number): AnameenSubject => ({
  id,
  player: `لاعب ${id}`,
  clues: Array.from({ length: ANAMEEN_CLUES }, (_, k) => `دليل ${k + 1}`),
});

describe('anameen game shape', () => {
  it('fixes the shape: 5 clues visible from the start, +1 flat, counts 1/3/5/10 default 3', () => {
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

  function setup(): AnameenComponent {
    const fixture = TestBed.createComponent(AnameenComponent);
    fixture.detectChanges();
    const c = fixture.componentInstance;
    c.subjects.set([subject(1), subject(2), subject(3)]);
    fixture.detectChanges();
    return c;
  }

  /** The change the shared attribution emits for one award tap, per §2.3. */
  function award(c: AnameenComponent, picked: AnameenTeam): AttributionChange {
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

  it('creates with every subject playable immediately — no start gate, no reveal state', () => {
    const c = TestBed.createComponent(AnameenComponent).componentInstance;
    expect(c.teamA()).toBe('');
    expect(c.count()).toBe(ANAMEEN_COUNT_DEFAULT);
    c.subjects.set([subject(1)]);
    expect(c.assigned(1)).toBeNull();
    expect(((c.current() as AnameenSubject).clues.length)).toBe(5); // all five live
  });

  it('both teams award the same subject: +1 flat, audited, re-tap reverses', () => {
    const c = setup();
    c.onAssign(award(c, 'A'));
    expect(c.scoreA()).toBe(1);
    expect(c.audit().at(-1)).toEqual(
      expect.objectContaining({ team: 'A', delta: 1, label: 'لاعب 1' }),
    );
    c.onAssign(award(c, 'A'));
    expect(c.scoreA()).toBe(0);
    expect(c.assigned(1)).toBeNull();
    expect(c.audit().map((e) => e.delta)).toEqual([1, -1]);
  });

  it('re-pointing the award from one team to the other nets one swap', () => {
    const c = setup();
    c.onAssign(award(c, 'A'));
    c.onAssign({ ...award(c, 'B'), from: 'A', to: 'B' });
    expect(c.scoreA()).toBe(0);
    expect(c.scoreB()).toBe(1);
    expect(c.assigned(1)).toBe('B');
  });

  it('the audit strip always sums to the scoreboard', () => {
    const c = setup();
    c.onAssign(award(c, 'B')); // +1 B on subject 1
    c.go(1);
    const s = c.current() as AnameenSubject;
    c.onAssign({ ...award(c, 'A'), from: null, to: 'A', label: s.player });
    c.onAssign(award(c, 'A')); // reversed: -1
    expect(c.audit().reduce((sum, e) => sum + e.delta, 0)).toBe(1);
    expect(c.scoreA()).toBe(0);
    expect(c.scoreB()).toBe(1);
  });

  it('no team ships pre-assigned subjects: guessing is simultaneous', () => {
    const c = setup();
    expect(c.subjects().slice(0, 3).every((s) => c.assigned(s.id) === null)).toBe(true);
  });

  it('rejects counts outside the 1/3/5/10 gate and resets the cursor on a change', () => {
    const c = setup();
    c.go(2);
    c.setCount(7);
    expect(c.count()).toBe(ANAMEEN_COUNT_DEFAULT);
    c.setCount(5);
    expect(c.count()).toBe(5);
    expect(c.idx()).toBe(0);
  });

  it('navigation stays in bounds across the subjects', () => {
    const c = setup();
    expect(c.current()?.id).toBe(1);
    c.go(1);
    expect(c.current()?.id).toBe(2);
    c.go(2);
    c.next();
    expect(c.idx()).toBe(2);
    c.prev();
    c.prev();
    c.prev();
    expect(c.idx()).toBe(0);
  });

  it('toggles an asked clue without revealing, scoring, or changing other clues', () => {
    const c = setup();
    expect(c.asked(1)).toBe(false);
    expect(c.asked(2)).toBe(false);
    c.toggleAsked(1);
    expect(c.asked(1)).toBe(true);
    expect(c.asked(2)).toBe(false);
    expect(c.current()?.clues).toEqual(subject(1).clues);
    expect(c.scoreA()).toBe(0);
    expect(c.scoreB()).toBe(0);
    c.toggleAsked(1);
    expect(c.asked(1)).toBe(false);
  });

  it('resets asked clues when moving to a new card or redrawing', () => {
    const c = setup();
    c.toggleAsked(1);
    c.go(1);
    expect(c.asked(1)).toBe(false);
    c.toggleAsked(3);
    c.reload();
    expect(c.asked(3)).toBe(false);
  });

  it('per-subject dice swaps the player and reverses its +1 with an audited -1', async () => {
    const c = setup();
    const api = TestBed.inject(ApiService);
    c.onAssign(award(c, 'A'));
    vi.spyOn(api, 'anameenRandom').mockReturnValue(of([subject(99)]));
    await c.reroll(0);
    expect(c.subjects()[0].id).toBe(99);
    expect(c.asked(1)).toBe(false);
    expect(c.assigned(99)).toBeNull();
    expect(c.scoreA()).toBe(0);
    expect(c.audit().at(-1)).toEqual(
      expect.objectContaining({ team: 'A', delta: -1, label: 'لاعب 1' }),
    );
    expect(api.anameenRandom).toHaveBeenCalledWith(1);
  });

  it('an empty dice response keeps the subject and reports the miss politely', async () => {
    const c = setup();
    const api = TestBed.inject(ApiService);
    vi.spyOn(api, 'anameenRandom').mockReturnValue(of([]));
    await c.reroll(0);
    expect(c.subjects()[0].id).toBe(1);
    expect(c.msg()).toContain('تعذر');
  });

  it('redraw re-arms the draw at the top without touching the scoreboard', () => {
    const c = setup();
    c.onAssign(award(c, 'A'));
    c.go(2);
    c.reload();
    expect(c.idx()).toBe(0);
    expect(c.scoreA()).toBe(1); // scores survive a redraw; assignments are id-keyed
  });

  it('new game re-arms the draw and clears every tally', () => {
    const c = setup();
    c.onAssign(award(c, 'A'));
    c.go(2);
    c.newGame();
    expect(c.scoreA()).toBe(0);
    expect(c.scoreB()).toBe(0);
    expect(c.audit().length).toBe(0);
    expect(c.idx()).toBe(0);
    expect(c.assigned(1)).toBeNull();
    expect(c.assigned(3)).toBeNull();
  });
});
