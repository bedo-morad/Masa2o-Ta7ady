import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { IhbidComponent } from './ihbid.component';
import { IhbidQuestion } from '../services/api.service';

describe('IhbidComponent asked marks (rendered screen)', () => {
  let fixture: ComponentFixture<IhbidComponent>;
  let http: HttpTestingController;
  const questions: IhbidQuestion[] = [
    { id: 11, questionText: 'الأول المعروض', answerText: 'إجابة الأول' },
    { id: 22, questionText: 'الثاني المعروض', answerText: 'إجابة الثاني' },
    { id: 33, questionText: 'الثالث المعروض', answerText: 'إجابة الثالث' },
  ];
  const replacement: IhbidQuestion = {
    id: 99,
    questionText: 'بديل جديد',
    answerText: 'جواب البديل',
  };

  async function setup(rows = questions): Promise<void> {
    fixture = TestBed.createComponent(IhbidComponent);
    fixture.detectChanges();
    http.expectOne((r) => r.urlWithParams.endsWith('/ihbid?count=10')).flush(rows);
    await fixture.whenStable();
    fixture.detectChanges();
  }
  const marks = () =>
    Array.from(fixture.nativeElement.querySelectorAll('.asked-mark')) as HTMLButtonElement[];
  const rows = () => Array.from(fixture.nativeElement.querySelectorAll('.qitem')) as HTMLElement[];
  const click = (el: Element) => {
    (el as HTMLButtonElement).click();
    fixture.detectChanges();
  };

  beforeEach(async () => {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [IhbidComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('renders deterministic rows in order, all unmarked, with only the existing controls', async () => {
    await setup();
    expect(rows().map((r) => r.querySelector('.qbody')?.textContent?.trim())).toEqual([
      'الأول المعروض',
      'الثاني المعروض',
      'الثالث المعروض',
    ]);
    expect(marks()).toHaveLength(3);
    expect(rows().every((row) => row.querySelectorAll('button').length === 3)).toBe(true);
    expect(marks().map((b) => b.getAttribute('aria-pressed'))).toEqual(['false', 'false', 'false']);
    expect(marks().map((b) => b.textContent?.trim())).toEqual(['1', '2', '3']);
    expect(marks().every((b) => b.type === 'button' && b.name.startsWith('asked-question-'))).toBe(
      true,
    );
    expect(marks()[0].getAttribute('aria-label')).toBe('تحديد السؤال 1 على أنه طُرح');
    expect(fixture.nativeElement.querySelectorAll('.asked-mark[title]').length).toBe(0);
    expect(fixture.nativeElement.querySelectorAll('.asked-mark').length).toBe(3);
    expect(fixture.nativeElement.textContent).not.toContain('تم السؤال');
  });

  it('highlights the whole asked card and restores its normal appearance on undo', async () => {
    await setup();
    expect(rows().map((row) => row.classList.contains('asked'))).toEqual([false, false, false]);
    click(marks()[0]);
    expect(rows().map((row) => row.classList.contains('asked'))).toEqual([true, false, false]);
    click(marks()[0]);
    expect(rows().map((row) => row.classList.contains('asked'))).toEqual([false, false, false]);
  });

  it('marks, undoes, repeatedly toggles, and keeps marks independent through visible badges', async () => {
    await setup();
    click(marks()[0]);
    expect(marks()[0].getAttribute('aria-label')).toBe('إلغاء تحديد السؤال 1 على أنه طُرح');
    click(marks()[0]);
    click(marks()[1]);
    click(marks()[1]);
    click(marks()[1]);
    expect(marks().map((b) => b.getAttribute('aria-pressed'))).toEqual(['false', 'true', 'false']);
    click(marks()[2]);
    expect(marks().map((b) => b.getAttribute('aria-pressed'))).toEqual(['false', 'true', 'true']);
  });

  it('undoes a mark without changing content, order, scores, timer, or draw HTTP', async () => {
    await setup();
    const beforeRows = rows().map((r) => r.querySelector('.qbody')?.textContent?.trim());
    const beforeOrder = rows().map((r) => r.querySelector('.qnum')?.textContent?.trim());
    const timer = fixture.nativeElement.querySelector('.timer')?.innerHTML;
    click(marks()[1]);
    expect(marks()[1].getAttribute('aria-pressed')).toBe('true');
    click(fixture.nativeElement.querySelector('.team-a .plus')!);
    expect(marks()[1].getAttribute('aria-pressed')).toBe('true');
    const scoreboard = fixture.nativeElement.querySelector('.scoreboard')?.innerHTML;
    click(marks()[1]);
    expect(marks()[1].getAttribute('aria-pressed')).toBe('false');
    expect(rows().map((r) => r.querySelector('.qbody')?.textContent?.trim())).toEqual(beforeRows);
    expect(rows().map((r) => r.querySelector('.qnum')?.textContent?.trim())).toEqual(beforeOrder);
    expect(fixture.nativeElement.querySelector('.scoreboard')?.innerHTML).toBe(scoreboard);
    expect(fixture.nativeElement.querySelector('.timer')?.innerHTML).toBe(timer);
    expect(fixture.nativeElement.querySelector('.team-a .score')?.textContent?.trim()).toBe('1');
    http.expectNone((r) => r.url.includes('/ihbid'));
  });

  it('keeps reveal visibility and asked marks independent across all four state combinations', async () => {
    await setup();
    const firstRow = () => rows()[0];
    const answerVisible = () => firstRow().querySelector('.answer .value') !== null;
    const toggleReveal = () => click(firstRow().querySelector('.qactions .mini:not(.reroll)')!);
    for (const marked of [false, true]) {
      if ((marks()[0].getAttribute('aria-pressed') === 'true') !== marked) click(marks()[0]);
      for (const visible of [false, true]) {
        if (answerVisible() !== visible) toggleReveal();
        click(marks()[0]);
        expect(answerVisible()).toBe(visible);
        click(marks()[0]);
        expect(answerVisible()).toBe(visible);
        expect(marks()[0].getAttribute('aria-pressed')).toBe(String(marked));
        toggleReveal();
        expect(answerVisible()).toBe(!visible);
        expect(marks()[0].getAttribute('aria-pressed')).toBe(String(marked));
        toggleReveal();
        expect(answerVisible()).toBe(visible);
        expect(marks()[0].getAttribute('aria-pressed')).toBe(String(marked));
      }
    }
  });

  it('clears marks on count change, new draw, and a fresh page instance', async () => {
    await setup();
    click(marks()[0]);
    click(marks()[2]);
    const select = fixture.nativeElement.querySelector('#ih-count') as HTMLSelectElement;
    select.selectedIndex = 0;
    select.dispatchEvent(new Event('change', { bubbles: true }));
    fixture.detectChanges();
    http.expectOne((r) => r.urlWithParams.endsWith('count=5')).flush(questions.slice(0, 2));
    await fixture.whenStable();
    fixture.detectChanges();
    expect(marks().every((b) => b.getAttribute('aria-pressed') === 'false')).toBe(true);
    click(marks()[0]);
    click(fixture.nativeElement.querySelector('.redraw')!);
    http.expectOne((r) => r.urlWithParams.endsWith('count=5')).flush(questions.slice(1));
    await fixture.whenStable();
    fixture.detectChanges();
    expect(marks().every((b) => b.getAttribute('aria-pressed') === 'false')).toBe(true);
    const fresh = TestBed.createComponent(IhbidComponent);
    fresh.detectChanges();
    http.expectOne((r) => r.urlWithParams.endsWith('count=10')).flush(questions);
    await fresh.whenStable();
    fresh.detectChanges();
    expect(
      (
        Array.from(fresh.nativeElement.querySelectorAll('.asked-mark')) as HTMLButtonElement[]
      ).every((b) => b.getAttribute('aria-pressed') === 'false'),
    ).toBe(true);
    fresh.destroy();
  });

  it('rerolls marked and unmarked rows with six candidates, skips displayed IDs, and clears replacement marks', async () => {
    await setup();
    click(marks()[0]);
    click(marks()[2]);
    const rerolls = () =>
      Array.from(fixture.nativeElement.querySelectorAll('.qitem .reroll')) as HTMLButtonElement[];
    click(rerolls()[1]);
    const req = http.expectOne((r) => r.urlWithParams.endsWith('count=6'));
    expect(req.request.method).toBe('GET');
    req.flush([
      questions[0],
      questions[1],
      { id: 44, questionText: 'اختيار غير معروض', answerText: 'جواب' },
      replacement,
      { id: 55, questionText: 'مرشح', answerText: 'جواب' },
      { id: 66, questionText: 'مرشح2', answerText: 'جواب' },
    ]);
    await fixture.whenStable();
    fixture.detectChanges();
    expect(rows().map((r) => r.querySelector('.qbody')?.textContent?.trim())).toEqual([
      'الأول المعروض',
      'اختيار غير معروض',
      'الثالث المعروض',
    ]);
    expect(marks().map((b) => b.getAttribute('aria-pressed'))).toEqual(['true', 'false', 'true']);
    click(rerolls()[0]);
    http
      .expectOne((r) => r.urlWithParams.endsWith('count=6'))
      .flush([
        questions[0],
        replacement,
        { id: 77, questionText: 'آخر', answerText: 'جواب' },
        { id: 78, questionText: 'آخر2', answerText: 'جواب' },
        { id: 79, questionText: 'آخر3', answerText: 'جواب' },
        { id: 80, questionText: 'آخر4', answerText: 'جواب' },
      ]);
    await fixture.whenStable();
    fixture.detectChanges();
    expect(marks().map((b) => b.getAttribute('aria-pressed'))).toEqual(['false', 'false', 'true']);
    click(rerolls()[0]);
    http
      .expectOne((r) => r.urlWithParams.endsWith('count=6'))
      .flush([
        questions[0],
        { id: 81, questionText: 'عودة', answerText: 'جواب' },
        { id: 82, questionText: 'مرشح', answerText: 'جواب' },
        { id: 83, questionText: 'مرشح', answerText: 'جواب' },
        { id: 84, questionText: 'مرشح', answerText: 'جواب' },
        { id: 85, questionText: 'مرشح', answerText: 'جواب' },
      ]);
    await fixture.whenStable();
    fixture.detectChanges();
    expect(marks()[0].getAttribute('aria-pressed')).toBe('false');
    expect(rows()[0].querySelector('.qbody')?.textContent?.trim()).toBe('الأول المعروض');
  });

  it('preserves marks on a failed or empty reroll', async () => {
    await setup();
    click(marks()[0]);
    click(fixture.nativeElement.querySelector('.qitem .reroll')!);
    http
      .expectOne((r) => r.urlWithParams.endsWith('count=6'))
      .flush([], { status: 200, statusText: 'OK' });
    await fixture.whenStable();
    fixture.detectChanges();
    expect(marks()[0].getAttribute('aria-pressed')).toBe('true');
    click(fixture.nativeElement.querySelector('.qitem .reroll')!);
    http
      .expectOne((r) => r.urlWithParams.endsWith('count=6'))
      .flush('fail', { status: 500, statusText: 'failed' });
    await fixture.whenStable();
    fixture.detectChanges();
    expect(marks()[0].getAttribute('aria-pressed')).toBe('true');
  });

  it('renders the selected question search link without changing reveal visibility', async () => {
    await setup();
    const first = rows()[0];
    const link = () => first.querySelector('.gq') as HTMLAnchorElement;
    expect(link().getAttribute('href')).toBe(
      `https://www.google.com/search?q=${encodeURIComponent(questions[0].questionText)}`,
    );
    expect(link().getAttribute('aria-label')).toBe('بحث عن السؤال');
    expect(first.querySelector('.answer .value')).toBeNull();
    click(first.querySelector('.qactions .mini.ghost')!);
    expect(first.querySelector('.answer .value')?.textContent?.trim()).toBe(questions[0].answerText);
    expect(first.querySelector('.gq')).not.toBeNull();
    expect(link().getAttribute('href')).toContain(encodeURIComponent(questions[0].questionText));
  });
});
