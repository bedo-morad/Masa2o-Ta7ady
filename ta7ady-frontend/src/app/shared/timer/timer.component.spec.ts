import { TestBed } from '@angular/core/testing';
import { SettingsService } from '../settings/settings.service';
import { TimerComponent } from './timer.component';
import { vi } from 'vitest';

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

  it('vibrates on timeout when the toggle is on', () => {
    localStorage.clear();
    const vib = vi.fn(() => true);
    Object.defineProperty(window.navigator, 'vibrate', { value: vib, configurable: true });
    try {
      const fixture = TestBed.createComponent(TimerComponent);
      fixture.componentRef.setInput('defaultSeconds', 3);
      fixture.detectChanges();
      TestBed.inject(SettingsService).setVibrate(true);
      vi.useFakeTimers();
      try {
        fixture.componentInstance.start();
        vi.advanceTimersByTime(4000);
      } finally {
        vi.useRealTimers();
      }
      expect(vib).toHaveBeenCalledWith([200, 100, 200]);
      fixture.componentInstance.ngOnDestroy();
    } finally {
      Object.defineProperty(window.navigator, 'vibrate', { value: undefined, configurable: true });
      localStorage.clear();
    }
  });

  it('stays silent on vibration when the toggle is off', () => {
    localStorage.clear();
    const vib = vi.fn(() => true);
    Object.defineProperty(window.navigator, 'vibrate', { value: vib, configurable: true });
    try {
      const fixture = TestBed.createComponent(TimerComponent);
      fixture.componentRef.setInput('defaultSeconds', 3);
      fixture.detectChanges();
      TestBed.inject(SettingsService).setVibrate(false);
      vi.useFakeTimers();
      try {
        fixture.componentInstance.start();
        vi.advanceTimersByTime(4000);
      } finally {
        vi.useRealTimers();
      }
      expect(vib).not.toHaveBeenCalled();
      fixture.componentInstance.ngOnDestroy();
    } finally {
      Object.defineProperty(window.navigator, 'vibrate', { value: undefined, configurable: true });
      localStorage.clear();
    }
  });
});
