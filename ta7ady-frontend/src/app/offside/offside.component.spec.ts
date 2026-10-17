import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { OffsideComponent } from './offside.component';
import { OffsideRule } from '../api.service';

describe('OffsideComponent', () => {
  let fixture: ComponentFixture<OffsideComponent>;
  const rules: OffsideRule[] = [
    { id: 1, ruleText: 'القاعدة الأولى' },
    { id: 2, ruleText: 'القاعدة الثانية' },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OffsideComponent],
      providers: [provideHttpClient(), provideRouter([])],
    }).compileComponents();
    fixture = TestBed.createComponent(OffsideComponent);
    fixture.componentInstance.rows.set(rules);
    fixture.detectChanges();
  });

  const marks = () => Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('.asked-mark')) as HTMLButtonElement[];

  it('renders independent accessible marks and toggles them through the visible badge seam', () => {
    expect(marks()).toHaveLength(2);
    expect(marks()[0].getAttribute('aria-pressed')).toBe('false');
    expect(marks()[0].getAttribute('aria-label')).toContain('قاعدة');
    marks()[0].click();
    fixture.detectChanges();
    expect(marks()[0].getAttribute('aria-pressed')).toBe('true');
    expect(marks()[1].getAttribute('aria-pressed')).toBe('false');
    marks()[0].click();
    fixture.detectChanges();
    expect(marks()[0].getAttribute('aria-pressed')).toBe('false');
    expect(fixture.nativeElement.querySelectorAll('.asked-mark').length).toBe(2);
    expect(fixture.nativeElement.textContent).toContain('القاعدة الأولى');
    expect(fixture.nativeElement.textContent).toContain('القاعدة الثانية');
  });

  it('starts a fresh page with no marks and shows no added visible control text', () => {
    const fresh = TestBed.createComponent(OffsideComponent);
    fresh.componentInstance.rows.set(rules);
    fresh.detectChanges();
    expect((Array.from((fresh.nativeElement as HTMLElement).querySelectorAll('.asked-mark')) as HTMLButtonElement[]).every((b) => b.getAttribute('aria-pressed') === 'false')).toBe(true);
    expect(fresh.nativeElement.textContent).not.toContain('تم السؤال');
  });
});
