import { TestBed } from '@angular/core/testing';
import {
  AttributionComponent,
  attributionDeltas,
  signed,
} from './attribution.component';

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
});
