import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { IhbidComponent } from './ihbid.component';
import { IhbidQuestion } from '../api.service';

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

  it('marks, undoes, repeatedly toggles, and keeps marks independent through visible badges', async () => {
    await setup();
    click(marks()[0]);
    click(marks()[0]);
    click(marks()[1]);
    click(marks()[1]);
    click(marks()[1]);
    expect(marks().map((b) => b.getAttribute('aria-pressed'))).toEqual(['false', 'true', 'false']);
    click(marks()[2]);
    expect(marks().map((b) => b.getAttribute('aria-pressed'))).toEqual(['false', 'true', 'true']);
  });

  it('does not draw or change content, order, scores, or timer when toggling', async () => {
    await setup();
    const beforeRows = rows().map((r) => r.querySelector('.qbody')?.textContent?.trim());
    const scoreboard = fixture.nativeElement.querySelector('.scoreboard')?.innerHTML;
    const timer = fixture.nativeElement.querySelector('.timer')?.innerHTML;
    click(marks()[1]);
    http.expectNone((r) => r.url.includes('/ihbid'));
    expect(rows().map((r) => r.querySelector('.qbody')?.textContent?.trim())).toEqual(beforeRows);
    expect(fixture.nativeElement.querySelector('.scoreboard')?.innerHTML).toBe(scoreboard);
    expect(fixture.nativeElement.querySelector('.timer')?.innerHTML).toBe(timer);
    click(fixture.nativeElement.querySelector('.team-a .plus'));
    expect(fixture.nativeElement.querySelector('.team-a .score')?.textContent?.trim()).toBe('1');
    click(marks()[1]);
    click(fixture.nativeElement.querySelector('.team-a .plus'));
    expect(fixture.nativeElement.querySelector('.team-a .score')?.textContent?.trim()).toBe('2');
  });

  it('keeps asked marks independent from answer reveal in both directions', async () => {
    await setup();
    const reveal = fixture.nativeElement.querySelector('.qitem .ghost') as HTMLButtonElement;
    click(marks()[0]);
    click(reveal);
    expect(marks()[0].getAttribute('aria-pressed')).toBe('true');
    expect(fixture.nativeElement.querySelector('.answer .value')?.textContent?.trim()).toBe(
      'إجابة الأول',
    );
    click(marks()[0]);
    expect(marks()[0].getAttribute('aria-pressed')).toBe('false');
    click(fixture.nativeElement.querySelector('.answer .mini')!);
    expect(marks()[0].getAttribute('aria-pressed')).toBe('false');
    expect(fixture.nativeElement.querySelector('.answer')).toBeNull();
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

  it('preserves the existing google URL contract', async () => {
    await setup();
    expect(fixture.componentInstance.googleUrl('كم هدفا سجل؟')).toBe(
      `https://www.google.com/search?q=${encodeURIComponent('كم هدفا سجل؟')}`,
    );
  });
});
