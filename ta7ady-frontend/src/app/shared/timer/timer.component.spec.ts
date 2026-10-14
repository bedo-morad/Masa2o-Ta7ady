import { TestBed } from '@angular/core/testing';
import { SettingsService } from '../settings/settings.service';
import { TimerComponent } from './timer.component';

describe('TimerComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [TimerComponent] }).compileComponents();
  });

  it('creates with the configured default', () => {
    const fixture = TestBed.createComponent(TimerComponent);
    fixture.componentRef.setInput('defaultSeconds', 45);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
    expect(fixture.componentInstance.remaining()).toBe(45);
  });

  it('toggles between running and paused', () => {
    const c = TestBed.createComponent(TimerComponent).componentInstance;
    expect(c.running()).toBe(false);
    c.toggle();
    expect(c.running()).toBe(true);
    c.toggle();
    expect(c.running()).toBe(false);
    c.ngOnDestroy();
  });

  it('uses the settings override when timerKey is set', () => {
    localStorage.clear();
    TestBed.inject(SettingsService).setTimerOverride('password', 12);
    const fixture = TestBed.createComponent(TimerComponent);
    fixture.componentRef.setInput('defaultSeconds', 60);
    fixture.componentRef.setInput('timerKey', 'password');
    fixture.detectChanges();
    expect(fixture.componentInstance.remaining()).toBe(12);
    localStorage.clear();
  });
});
