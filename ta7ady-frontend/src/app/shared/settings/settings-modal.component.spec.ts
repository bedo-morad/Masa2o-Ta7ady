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
    expect(el.querySelector('[aria-label="التنبيه"]')).toBeTruthy();
    expect(el.querySelector('[aria-label="مؤقتات الفقرات"]')).toBeTruthy();
    expect(el.querySelector('[aria-label="المظهر"]')).toBeTruthy();
  });

  it('renders seven timer fields and a preview button', () => {
    const fixture = TestBed.createComponent(SettingsModalComponent);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelectorAll('.timer-field').length).toBe(7);
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
    expect(svc.alarmSoundId()).toBe('chime');
    buttons[2].click();
    expect(svc.alarmSoundId()).toBe('buzzer');
  });
});
