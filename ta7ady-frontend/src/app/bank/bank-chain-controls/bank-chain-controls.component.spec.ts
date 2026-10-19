import { TestBed } from '@angular/core/testing';
import { BankChainControlsComponent } from './bank-chain-controls.component';

describe('BankChainControlsComponent', () => {
  it('keeps correct and miss available while banking requires a positive chain', async () => {
    await TestBed.configureTestingModule({
      imports: [BankChainControlsComponent],
    }).compileComponents();
    const fixture = TestBed.createComponent(BankChainControlsComponent);
    fixture.detectChanges();
    const root: HTMLElement = fixture.nativeElement;
    const bank = root.querySelector<HTMLButtonElement>('.bank')!;
    const correct = vi.fn();
    const miss = vi.fn();
    const banked = vi.fn();
    fixture.componentInstance.correct.subscribe(correct);
    fixture.componentInstance.miss.subscribe(miss);
    fixture.componentInstance.bank.subscribe(banked);

    expect(bank.disabled).toBe(true);
    bank.click();
    expect(banked).not.toHaveBeenCalled();
    root.querySelector<HTMLButtonElement>('.correct')!.click();
    root.querySelector<HTMLButtonElement>('.miss')!.click();
    expect(correct).toHaveBeenCalledOnce();
    expect(miss).toHaveBeenCalledOnce();
    expect(root.querySelector('.chain-flag')).toBeNull();

    fixture.componentRef.setInput('value', 2048);
    fixture.detectChanges();
    expect(root.querySelector('.chain-flag')).not.toBeNull();
    expect(bank.disabled).toBe(false);
    bank.click();
    expect(banked).toHaveBeenCalledOnce();
  });
});
