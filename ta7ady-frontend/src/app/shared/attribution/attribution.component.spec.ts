import { TestBed } from '@angular/core/testing';
import {
  AttributionComponent,
  AuditStripComponent,
  attributionDeltas,
  signed,
} from './attribution.component';
import { rankValue, teamContribution, trioHolder } from './rank-points';
import { SettingsService } from '../../services/settings.service';

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

describe('attributionDeltas', () => {
  it('assigns full points to the picked team', () => {
    expect(attributionDeltas(7, null, 'A')).toEqual({ deltaA: 7, deltaB: 0 });
    expect(attributionDeltas(1, null, 'B')).toEqual({ deltaA: 0, deltaB: 1 });
  });

  it('unassign reverses the exact points', () => {
    expect(attributionDeltas(7, 'A', null)).toEqual({ deltaA: -7, deltaB: 0 });
    expect(attributionDeltas(-2, 'B', null)).toEqual({ deltaA: 0, deltaB: 2 });
  });

  it('switching teams reverses one side and adds the other', () => {
    expect(attributionDeltas(5, 'A', 'B')).toEqual({ deltaA: -5, deltaB: 5 });
    expect(attributionDeltas(-3, 'B', 'A')).toEqual({ deltaA: -3, deltaB: 3 });
  });

  it('assign + unassign nets to zero', () => {
    const a = attributionDeltas(10, null, 'A');
    const b = attributionDeltas(10, 'A', null);
    expect(a.deltaA + b.deltaA).toBe(0);
  });
});

describe('signed', () => {
  it('formats with an explicit sign', () => {
    expect(signed(6)).toBe('+6');
    expect(signed(-3)).toBe('-3');
    expect(signed(0)).toBe('0');
  });
});

describe('AttributionComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AttributionComponent],
    }).compileComponents();
  });

  it('creates', () => {
    const fixture = TestBed.createComponent(AttributionComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('marks either selected team button with the same pressed-state hook', () => {
    const fixture = TestBed.createComponent(AttributionComponent);
    const component = fixture.componentInstance;
    const buttons = () =>
      Array.from(fixture.nativeElement.querySelectorAll('.tbtn')) as HTMLButtonElement[];

    fixture.componentRef.setInput('assigned', 'A');
    fixture.detectChanges();
    expect(buttons().map((button) => button.classList.contains('on'))).toEqual([
      true,
      false,
    ]);
    expect(buttons().map((button) => button.getAttribute('aria-pressed'))).toEqual([
      'true',
      'false',
    ]);

    fixture.componentRef.setInput('assigned', 'B');
    fixture.detectChanges();
    expect(buttons().map((button) => button.classList.contains('on'))).toEqual([
      false,
      true,
    ]);
    expect(buttons().map((button) => button.getAttribute('aria-pressed'))).toEqual([
      'false',
      'true',
    ]);
    expect(component).toBeTruthy();
  });

  it('tapping a team emits an assign change', () => {
    const fixture = TestBed.createComponent(AttributionComponent);
    fixture.componentRef.setInput('label', 'جواب');
    fixture.componentRef.setInput('points', 4);
    fixture.componentRef.setInput('assigned', null);
    const seen: unknown[] = [];
    fixture.componentInstance.change.subscribe((c) => seen.push(c));
    fixture.componentInstance.tap('B');
    expect(seen).toEqual([{ label: 'جواب', points: 4, picked: 'B', from: null, to: 'B' }]);
  });

  it('tapping the assigned team again emits an unassign change', () => {
    const fixture = TestBed.createComponent(AttributionComponent);
    fixture.componentRef.setInput('assigned', 'A');
    const seen: unknown[] = [];
    fixture.componentInstance.change.subscribe((c) => seen.push(c));
    fixture.componentInstance.tap('A');
    expect(seen).toEqual([
      { label: '', points: 0, picked: 'A', from: 'A', to: null },
    ]);
  });

  it('tapping the other team emits a switch change', () => {
    const fixture = TestBed.createComponent(AttributionComponent);
    fixture.componentRef.setInput('assigned', 'A');
    let last: { from: unknown; to: unknown } | null = null;
    fixture.componentInstance.change.subscribe((c) => (last = c));
    fixture.componentInstance.tap('B');
    expect(last).toEqual(
      expect.objectContaining({ picked: 'B', from: 'A', to: 'B' }),
    );
  });

  it('fixed mode (default) books the flat points value', () => {
    const fixture = TestBed.createComponent(AttributionComponent);
    fixture.componentRef.setInput('points', 7);
    expect(fixture.componentInstance.displayPoints()).toBe(7);
  });

  it('mode: rank derives the points from the rank', () => {
    const fixture = TestBed.createComponent(AttributionComponent);
    fixture.componentRef.setInput('mode', 'rank');
    fixture.componentRef.setInput('rank', 11);
    expect(fixture.componentInstance.displayPoints()).toBe(-1);
    const seen: { picked: 'A' | 'B'; points: number }[] = [];
    fixture.componentInstance.change.subscribe((c) =>
      seen.push({ picked: c.picked, points: c.points }),
    );
    fixture.componentInstance.tap('A');
    expect(seen).toEqual([{ picked: 'A', points: -1 }]);
  });
});

describe('AuditStripComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AuditStripComponent],
    }).compileComponents();
  });

  it('prefers page names, then settings teams, then generic fallbacks', () => {
    const settings = TestBed.inject(SettingsService);
    settings.setTeamA('الصقور');
    settings.setTeamB('النمور');
    try {
      const fixture = TestBed.createComponent(AuditStripComponent);
      fixture.detectChanges();
      const strip = fixture.componentInstance;
      expect(strip.name('A')).toBe('الصقور');
      expect(strip.name('B')).toBe('النمور');
      fixture.componentRef.setInput('teamA', 'مكتوب');
      expect(strip.name('A')).toBe('مكتوب');
    } finally {
      settings.resetAll();
    }
    const bare = TestBed.createComponent(AuditStripComponent).componentInstance;
    expect(bare.name('A')).toBe('الفريق الأول');
    expect(bare.name('B')).toBe('الفريق الثاني');
  });
});
