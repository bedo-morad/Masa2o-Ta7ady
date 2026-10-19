import { TestBed } from '@angular/core/testing';
import { BankQuestionCardComponent } from './bank-question-card.component';

describe('BankQuestionCardComponent', () => {
  it('renders the open answer and only enables navigation within the round', async () => {
    await TestBed.configureTestingModule({
      imports: [BankQuestionCardComponent],
    }).compileComponents();
    const fixture = TestBed.createComponent(BankQuestionCardComponent);
    fixture.componentRef.setInput('question', { id: 1, question: 'سؤال', answer: 'جواب' });
    fixture.componentRef.setInput('count', 2);
    fixture.detectChanges();
    const root: HTMLElement = fixture.nativeElement;
    expect(root.querySelector('.q')?.textContent).toContain('سؤال');
    expect(root.querySelector('.answer-value')?.textContent).toContain('جواب');
    const previous = root.querySelector<HTMLButtonElement>('[aria-label="السؤال السابق"]')!;
    const next = root.querySelector<HTMLButtonElement>('[aria-label="السؤال التالي"]')!;
    const wentPrevious = vi.fn();
    const wentNext = vi.fn();
    fixture.componentInstance.previous.subscribe(wentPrevious);
    fixture.componentInstance.next.subscribe(wentNext);

    expect(previous.disabled).toBe(true);
    expect(next.disabled).toBe(false);
    previous.click();
    next.click();
    expect(wentPrevious).not.toHaveBeenCalled();
    expect(wentNext).toHaveBeenCalledOnce();

    fixture.componentRef.setInput('position', 1);
    fixture.detectChanges();
    expect(previous.disabled).toBe(false);
    expect(next.disabled).toBe(true);
    previous.click();
    next.click();
    expect(wentPrevious).toHaveBeenCalledOnce();
    expect(wentNext).toHaveBeenCalledOnce();
  });
});
