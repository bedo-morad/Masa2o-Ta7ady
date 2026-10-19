import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { OffsideComponent } from './offside.component';
import { OffsideRule } from '../services/api.service';

describe('OffsideComponent asked marks (rendered screen)', () => {
  let fixture: ComponentFixture<OffsideComponent>;
  let http: HttpTestingController;
  const rules: OffsideRule[] = [
    { id: 11, ruleText: 'الأولى المعروضة' },
    { id: 22, ruleText: 'الثانية المعروضة' },
    { id: 33, ruleText: 'الثالثة المعروضة' },
  ];
  const rows = () => Array.from(fixture.nativeElement.querySelectorAll('.ritem')) as HTMLElement[];
  const marks = () =>
    Array.from(fixture.nativeElement.querySelectorAll('.asked-mark')) as HTMLButtonElement[];
  const click = (el: Element) => {
    (el as HTMLButtonElement).click();
    fixture.detectChanges();
  };
  async function setup(): Promise<void> {
    fixture = TestBed.createComponent(OffsideComponent);
    fixture.detectChanges();
    http.expectOne((r) => r.urlWithParams.endsWith('/offside?count=10')).flush(rules);
    await fixture.whenStable();
    fixture.detectChanges();
  }
  beforeEach(async () => {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [OffsideComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('renders ordered rules with every mark unmarked, wordless, named, and accessible', async () => {
    await setup();
    expect(rows().map((r) => r.querySelector('.rtext')?.textContent?.trim())).toEqual([
      'الأولى المعروضة',
      'الثانية المعروضة',
      'الثالثة المعروضة',
    ]);
    expect(marks().map((b) => b.textContent?.trim())).toEqual(['1', '2', '3']);
    expect(rows().every((row) => row.querySelectorAll('button').length === 2)).toBe(true);
    expect(marks().map((b) => b.getAttribute('aria-pressed'))).toEqual(['false', 'false', 'false']);
    expect(marks().every((b) => b.type === 'button' && b.name.startsWith('asked-rule-'))).toBe(
      true,
    );
    expect(marks()[0].getAttribute('aria-label')).toBe('تحديد القاعدة 1 على أنها طُرحت');
    expect(fixture.nativeElement.querySelectorAll('.asked-mark[title]').length).toBe(0);
    expect(fixture.nativeElement.textContent).not.toContain('تم السؤال');
    expect(fixture.nativeElement.querySelectorAll('.asked-mark').length).toBe(3);
  });

  it('supports mark, undo, repeated toggle, and independent visible controls without extra text', async () => {
    await setup();
    click(marks()[0]);
    expect(marks()[0].getAttribute('aria-label')).toBe('إلغاء تحديد القاعدة 1 على أنها طُرحت');
    click(marks()[0]);
    click(marks()[0]);
    click(marks()[1]);
    expect(marks().map((b) => b.getAttribute('aria-pressed'))).toEqual(['true', 'true', 'false']);
    click(marks()[1]);
    expect(marks().map((b) => b.getAttribute('aria-pressed'))).toEqual(['true', 'false', 'false']);
  });

  it('undoes a mark without changing content, order, scores, timer, or draw HTTP', async () => {
    await setup();
    const content = rows().map((r) => r.querySelector('.rtext')?.textContent?.trim());
    const order = rows().map((r) => r.querySelector('.rnum')?.textContent?.trim());
    const timer = fixture.nativeElement.querySelector('.timer')?.innerHTML;
    click(marks()[1]);
    expect(marks()[1].getAttribute('aria-pressed')).toBe('true');
    click(fixture.nativeElement.querySelector('.team-b .plus')!);
    expect(marks()[1].getAttribute('aria-pressed')).toBe('true');
    const scoreboard = fixture.nativeElement.querySelector('.scoreboard')?.innerHTML;
    click(marks()[1]);
    expect(marks()[1].getAttribute('aria-pressed')).toBe('false');
    expect(rows().map((r) => r.querySelector('.rtext')?.textContent?.trim())).toEqual(content);
    expect(rows().map((r) => r.querySelector('.rnum')?.textContent?.trim())).toEqual(order);
    expect(fixture.nativeElement.querySelector('.scoreboard')?.innerHTML).toBe(scoreboard);
    expect(fixture.nativeElement.querySelector('.timer')?.innerHTML).toBe(timer);
    expect(fixture.nativeElement.querySelector('.team-b .score')?.textContent?.trim()).toBe('1');
    http.expectNone((r) => r.url.includes('/offside'));
  });

  it('clears marks after count change, new draw, and a fresh fixture', async () => {
    await setup();
    click(marks()[0]);
    click(marks()[2]);
    const select = fixture.nativeElement.querySelector('#of-count') as HTMLSelectElement;
    select.selectedIndex = 0;
    select.dispatchEvent(new Event('change', { bubbles: true }));
    fixture.detectChanges();
    http.expectOne((r) => r.urlWithParams.endsWith('count=5')).flush(rules.slice(0, 2));
    await fixture.whenStable();
    fixture.detectChanges();
    expect(marks().every((b) => b.getAttribute('aria-pressed') === 'false')).toBe(true);
    click(marks()[0]);
    click(fixture.nativeElement.querySelector('.redraw')!);
    http.expectOne((r) => r.urlWithParams.endsWith('count=5')).flush(rules.slice(1));
    await fixture.whenStable();
    fixture.detectChanges();
    expect(marks().every((b) => b.getAttribute('aria-pressed') === 'false')).toBe(true);
    const fresh = TestBed.createComponent(OffsideComponent);
    fresh.detectChanges();
    http.expectOne((r) => r.urlWithParams.endsWith('count=10')).flush(rules);
    await fresh.whenStable();
    fresh.detectChanges();
    expect(
      (
        Array.from(fresh.nativeElement.querySelectorAll('.asked-mark')) as HTMLButtonElement[]
      ).every((b) => b.getAttribute('aria-pressed') === 'false'),
    ).toBe(true);
    fresh.destroy();
  });

  it('rerolls marked and unmarked rows using six candidates, skips displayed IDs, retains other marks, and clears returning rows', async () => {
    await setup();
    click(marks()[0]);
    click(marks()[2]);
    const rerolls = () =>
      Array.from(fixture.nativeElement.querySelectorAll('.reroll')) as HTMLButtonElement[];
    click(rerolls()[1]);
    http
      .expectOne((r) => r.urlWithParams.endsWith('count=6'))
      .flush([
        rules[0],
        rules[1],
        { id: 44, ruleText: 'بديل غير معروض' },
        { id: 55, ruleText: 'مرشح' },
        { id: 66, ruleText: 'مرشح' },
        { id: 77, ruleText: 'مرشح' },
      ]);
    await fixture.whenStable();
    fixture.detectChanges();
    expect(rows().map((r) => r.querySelector('.rtext')?.textContent?.trim())).toEqual([
      'الأولى المعروضة',
      'بديل غير معروض',
      'الثالثة المعروضة',
    ]);
    expect(marks().map((b) => b.getAttribute('aria-pressed'))).toEqual(['true', 'false', 'true']);
    click(rerolls()[0]);
    http
      .expectOne((r) => r.urlWithParams.endsWith('count=6'))
      .flush([
        rules[0],
        { id: 88, ruleText: 'بديل ثان' },
        { id: 89, ruleText: 'مرشح' },
        { id: 90, ruleText: 'مرشح' },
        { id: 91, ruleText: 'مرشح' },
        { id: 92, ruleText: 'مرشح' },
      ]);
    await fixture.whenStable();
    fixture.detectChanges();
    expect(marks().map((b) => b.getAttribute('aria-pressed'))).toEqual(['false', 'false', 'true']);
    click(rerolls()[0]);
    http
      .expectOne((r) => r.urlWithParams.endsWith('count=6'))
      .flush([
        rules[0],
        { id: 93, ruleText: 'عودة' },
        { id: 94, ruleText: 'مرشح' },
        { id: 95, ruleText: 'مرشح' },
        { id: 96, ruleText: 'مرشح' },
        { id: 97, ruleText: 'مرشح' },
      ]);
    await fixture.whenStable();
    fixture.detectChanges();
    expect(marks()[0].getAttribute('aria-pressed')).toBe('false');
    expect(rows()[0].querySelector('.rtext')?.textContent?.trim()).toBe('الأولى المعروضة');
  });

  it('preserves marks after empty and failed rerolls', async () => {
    await setup();
    click(marks()[0]);
    click(fixture.nativeElement.querySelector('.reroll')!);
    http.expectOne((r) => r.urlWithParams.endsWith('count=6')).flush([]);
    await fixture.whenStable();
    fixture.detectChanges();
    expect(marks()[0].getAttribute('aria-pressed')).toBe('true');
    click(fixture.nativeElement.querySelector('.reroll')!);
    http
      .expectOne((r) => r.urlWithParams.endsWith('count=6'))
      .flush('fail', { status: 500, statusText: 'failed' });
    await fixture.whenStable();
    fixture.detectChanges();
    expect(marks()[0].getAttribute('aria-pressed')).toBe('true');
  });
});
