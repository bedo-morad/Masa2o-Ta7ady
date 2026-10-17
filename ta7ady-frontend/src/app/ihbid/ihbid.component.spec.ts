import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { IhbidComponent } from './ihbid.component';
import { IhbidQuestion } from '../api.service';

describe('IhbidComponent', () => {
  let fixture: ComponentFixture<IhbidComponent>;
  const questions: IhbidQuestion[] = [
    { id: 1, questionText: 'السؤال الأول', answerText: 'الإجابة الأولى' },
    { id: 2, questionText: 'السؤال الثاني', answerText: 'الإجابة الثانية' },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IhbidComponent],
      providers: [provideHttpClient(), provideRouter([])],
    }).compileComponents();
    fixture = TestBed.createComponent(IhbidComponent);
    fixture.componentInstance.rows.set(questions);
    fixture.detectChanges();
  });

  const marks = () => Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('.asked-mark')) as HTMLButtonElement[];

  it('renders independent accessible marks and toggles them through the visible badge seam', () => {
    expect(marks()).toHaveLength(2);
    expect(marks()[0].getAttribute('aria-pressed')).toBe('false');
    expect(marks()[0].getAttribute('aria-label')).toContain('سؤال');
    marks()[0].click();
    fixture.detectChanges();
    expect(marks()[0].getAttribute('aria-pressed')).toBe('true');
    expect(marks()[1].getAttribute('aria-pressed')).toBe('false');
    marks()[0].click();
    fixture.detectChanges();
    expect(marks()[0].getAttribute('aria-pressed')).toBe('false');
    expect(fixture.nativeElement.querySelectorAll('.asked-mark').length).toBe(2);
    expect(fixture.nativeElement.textContent).toContain('السؤال الأول');
    expect(fixture.nativeElement.textContent).toContain('السؤال الثاني');
  });

  it('keeps asked state independent from reveal state', () => {
    marks()[0].click();
    fixture.detectChanges();
    const reveal = fixture.nativeElement.querySelector('.qactions .ghost') as HTMLButtonElement;
    reveal.click();
    fixture.detectChanges();
    expect(marks()[0].getAttribute('aria-pressed')).toBe('true');
    expect(fixture.nativeElement.textContent).toContain('الإجابة الأولى');
    (fixture.nativeElement.querySelector('.answer .mini') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(marks()[0].getAttribute('aria-pressed')).toBe('true');
  });

  it('starts a fresh page with no marks', () => {
    const fresh = TestBed.createComponent(IhbidComponent);
    fresh.componentInstance.rows.set(questions);
    fresh.detectChanges();
    expect((Array.from((fresh.nativeElement as HTMLElement).querySelectorAll('.asked-mark')) as HTMLButtonElement[]).every((b) => b.getAttribute('aria-pressed') === 'false')).toBe(true);
  });

  it('keeps the existing reveal toggle contract', () => {
    const c = fixture.componentInstance;
    c.toggle(7);
    expect(c.revealed().has(7)).toBe(true);
    c.toggle(7);
    expect(c.revealed().has(7)).toBe(false);
  });

  it('builds an encoded google search url', () => {
    expect(fixture.componentInstance.googleUrl('كم هدفا سجل؟')).toBe(`https://www.google.com/search?q=${encodeURIComponent('كم هدفا سجل؟')}`);
  });
});
