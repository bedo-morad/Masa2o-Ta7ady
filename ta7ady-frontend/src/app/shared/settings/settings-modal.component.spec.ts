import { TestBed } from '@angular/core/testing';
import { SettingsModalComponent } from './settings-modal.component';
import { SettingsService } from './settings.service';

describe('SettingsModalComponent', () => {
  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({ imports: [SettingsModalComponent] }).compileComponents();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('creates with all four groups', () => {
    const fixture = TestBed.createComponent(SettingsModalComponent);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('[aria-label="الفرق واللاعبون"]')).toBeTruthy();
    expect(el.querySelector('[aria-label="المؤقت"]')).toBeTruthy();
    expect(el.querySelector('[aria-label="مؤقتات الفقرات"]')).toBeTruthy();
    expect(el.querySelector('[aria-label="المظهر"]')).toBeTruthy();
  });

  it('renders eleven timer fields and a preview button', () => {
    const fixture = TestBed.createComponent(SettingsModalComponent);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelectorAll('.timer-field').length).toBe(11);
    expect(el.textContent).toContain('تجربة الصوت');
  });

  it('emits closed when the close button is pressed', () => {
    const fixture = TestBed.createComponent(SettingsModalComponent);
    fixture.detectChanges();
    let emitted = 0;
    fixture.componentInstance.closed.subscribe(() => emitted++);
    (fixture.nativeElement.querySelector('.icon-btn') as HTMLButtonElement).click();
    expect(emitted).toBe(1);
  });

  it('changing a sound choice updates the service', () => {
    const fixture = TestBed.createComponent(SettingsModalComponent);
    fixture.detectChanges();
    const svc = TestBed.inject(SettingsService);
    const buttons = Array.from(
      fixture.nativeElement.querySelectorAll('.sounds .choice'),
    ) as HTMLButtonElement[];
    buttons[1].click();
    expect(svc.alarmSoundId()).toBe('triplet');
    buttons[2].click();
    expect(svc.alarmSoundId()).toBe('gong');
  });

  it('timer placeholders show the real default seconds', () => {
    const fixture = TestBed.createComponent(SettingsModalComponent);
    fixture.detectChanges();
    const inputs = Array.from(
      fixture.nativeElement.querySelectorAll('.timer-field input'),
    ) as HTMLInputElement[];
    const byLabel = (label: string): HTMLInputElement | undefined =>
      inputs.find((i) => i.getAttribute('aria-label')?.includes(label));
    expect(byLabel('الباسورد')?.placeholder).toBe('30');
    expect(byLabel('التمثيل')?.placeholder).toBe('45');
    expect(byLabel('سرقة التمثيل')?.placeholder).toBe('10');
    expect(byLabel('أوفسايد')?.placeholder).toBe('5');
    expect(byLabel('بنك')?.placeholder).toBe('120');
    expect(byLabel('ريسك')?.placeholder).toBe('30');
    expect(byLabel('أنا مين؟')?.placeholder).toBe('60');
    expect(byLabel('مين في الصورة')?.placeholder).toBe('10');
    // Empty still means "use default": no override stored.
    const svc = TestBed.inject(SettingsService);
    expect(svc.timerSeconds('password', 30)).toBe(30);
  });

  it('vibrate toggle is on by default and flips the service', () => {
    const fixture = TestBed.createComponent(SettingsModalComponent);
    fixture.detectChanges();
    const svc = TestBed.inject(SettingsService);
    const toggle = fixture.nativeElement.querySelector(
      '.vibrate-toggle',
    ) as HTMLButtonElement;
    expect(toggle).toBeTruthy();
    expect(toggle.getAttribute('aria-pressed')).toBe('true');
    toggle.click();
    expect(svc.vibrateOnTimeout()).toBe(false);
    toggle.click();
    expect(svc.vibrateOnTimeout()).toBe(true);
  });
});
