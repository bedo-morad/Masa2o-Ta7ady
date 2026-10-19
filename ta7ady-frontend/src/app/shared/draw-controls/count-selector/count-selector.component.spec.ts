import { TestBed } from '@angular/core/testing';
import { CountSelectorComponent } from './count-selector.component';

describe('CountSelectorComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [CountSelectorComponent] }).compileComponents();
  });

  function create() {
    const fixture = TestBed.createComponent(CountSelectorComponent);
    fixture.componentRef.setInput('controlId', 'ih-count');
    fixture.componentRef.setInput('label', 'عدد الأسئلة');
    fixture.componentRef.setInput('count', 10);
    fixture.componentRef.setInput('options', [5, 10, 15, 20]);
    fixture.detectChanges();
    return fixture;
  }

  it('keeps numeric option values and the caller supplied id/label', () => {
    const fixture = create();
    const element = fixture.nativeElement as HTMLElement;
    const select = element.querySelector('select') as HTMLSelectElement;
    expect(element.querySelector('label')?.getAttribute('for')).toBe('ih-count');
    expect(select.id).toBe('ih-count');
    expect(fixture.componentInstance.count()).toBe(10);
    expect([...select.options].map((option) => option.textContent)).toEqual(['5', '10', '15', '20']);
  });

  it('emits only caller-owned count and redraw events', () => {
    const fixture = create();
    const seen: { count: number[]; redraw: number } = { count: [], redraw: 0 };
    fixture.componentInstance.countChanged.subscribe((value) => seen.count.push(value));
    fixture.componentInstance.redraw.subscribe(() => seen.redraw++);
    fixture.componentInstance.select(15);
    (fixture.nativeElement as HTMLElement).querySelector('button')?.dispatchEvent(new Event('click'));
    expect(seen.count).toEqual([15]);
    expect(seen.redraw).toBe(1);
  });

  it('disables redraw while loading without owning loading state', () => {
    const fixture = create();
    fixture.componentRef.setInput('loading', true);
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('button')?.hasAttribute('disabled')).toBe(true);
  });
});
