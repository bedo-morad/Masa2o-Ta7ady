import { TestBed } from '@angular/core/testing';
import {
  StrikeTrackerComponent,
  StrikeSlot,
  isEliminated,
  clampMistakes,
} from './strike-tracker.component';

const slot = (name: string, mistakes: number): StrikeSlot => ({ name, mistakes });

describe('isEliminated', () => {
  it('flags a slot only at the game threshold', () => {
    expect(isEliminated(slot('أ', 2), 3)).toBe(false);
    expect(isEliminated(slot('أ', 3), 3)).toBe(true);
    expect(isEliminated(slot('ب', 1), 2)).toBe(false);
    expect(isEliminated(slot('ب', 2), 2)).toBe(true);
  });
});

describe('clampMistakes', () => {
  it('keeps counts inside the 0..threshold window', () => {
    expect(clampMistakes(-1, 3)).toBe(0);
    expect(clampMistakes(2, 3)).toBe(2);
    expect(clampMistakes(4, 3)).toBe(3);
    expect(clampMistakes(4, 2)).toBe(2);
  });
});

describe('StrikeTrackerComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StrikeTrackerComponent],
    }).compileComponents();
  });

  function tracker(slots: StrikeSlot[], threshold = 3) {
    const fixture = TestBed.createComponent(StrikeTrackerComponent);
    fixture.componentRef.setInput('slots', slots);
    fixture.componentRef.setInput('eliminationThreshold', threshold);
    fixture.detectChanges();
    const seen: { bumps: { index: number; delta: number }[]; resets: number[] } = {
      bumps: [],
      resets: [],
    };
    fixture.componentInstance.bump.subscribe((b) => seen.bumps.push(b));
    fixture.componentInstance.reset.subscribe((i) => seen.resets.push(i));
    return { fixture, component: fixture.componentInstance, seen };
  }

  it('forwards increment and decrement bumps per slot', () => {
    const t = tracker([slot('أ', 0), slot('ب', 1)]);
    t.component.bumpUp(0);
    t.component.bumpDown(1);
    expect(t.seen.bumps).toEqual([
      { index: 0, delta: 1 },
      { index: 1, delta: -1 },
    ]);
  });

  it('reset emits the slot index', () => {
    const t = tracker([slot('أ', 2)]);
    t.component.resetSlot(0);
    expect(t.seen.resets).toEqual([0]);
  });

  it('rename emits the edited slot name', () => {
    const t = tracker([slot('أ', 0)]);
    const seen: { index: number; name: string }[] = [];
    t.component.rename.subscribe((r) => seen.push(r));
    t.component.retitle(0, 'كابتن');
    expect(seen).toEqual([{ index: 0, name: 'كابتن' }]);
  });

  it('at threshold 3 the third mistake shows the eliminated chip', () => {
    let current = [slot('أ', 3), slot('ب', 2)];
    const t = tracker(current);
    const el = t.fixture.nativeElement as HTMLElement;
    expect(el.querySelectorAll('.out-chip').length).toBe(1);
    expect(el.querySelector('.slot.out .mcount')?.textContent).toContain('3');
    current = [slot('أ', 3), slot('ب', 3)];
    t.fixture.componentRef.setInput('slots', current);
    t.fixture.detectChanges();
    expect(t.component.out(1)).toBe(true);
  });

  it('at threshold 2 the second mistake already eliminates', () => {
    const t = tracker([slot('أ', 2), slot('ب', 1)], 2);
    expect(t.component.out(0)).toBe(true);
    expect(t.component.out(1)).toBe(false);
    const el = t.fixture.nativeElement as HTMLElement;
    expect(el.querySelectorAll('.out').length).toBe(1);
  });

  it('renders nothing without slots', () => {
    const t = tracker([]);
    expect((t.fixture.nativeElement as HTMLElement).querySelector('.strikes')).toBeNull();
  });
});
