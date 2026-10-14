import { TestBed } from '@angular/core/testing';
import { AlarmService } from './alarm.service';
import { SettingsService } from '../settings/settings.service';

describe('AlarmService', () => {
  let alarm: AlarmService;
  let settings: SettingsService;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({}).compileComponents();
    alarm = TestBed.inject(AlarmService);
    settings = TestBed.inject(SettingsService);
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('maps volume to gain: 0 mutes, 5 is normal, 10 stays sane', () => {
    expect(alarm.gainFor(0)).toBe(0);
    expect(alarm.gainFor(5)).toBeCloseTo(0.28, 5);
    expect(alarm.gainFor(10)).toBeCloseTo(0.5, 5);
    expect(alarm.gainFor(10)).toBeLessThanOrEqual(0.5);
  });

  it('knows the three patterns', () => {
    expect(alarm.patternFor('classic')).toEqual([660, 520, 660]);
    expect(alarm.patternFor('chime')).toEqual([523, 659, 784]);
    expect(alarm.patternFor('buzzer')).toEqual([196, 196, 196]);
  });

  it('play() with volume 0 is a silent no-op', () => {
    settings.setAlarmVolume(0);
    expect(() => alarm.play()).not.toThrow();
  });

  it('play() does not throw for any sound, even without Web Audio', () => {
    for (const id of ['classic', 'chime', 'buzzer'] as const) {
      settings.setAlarmSound(id);
      settings.setAlarmVolume(5);
      expect(() => alarm.play()).not.toThrow();
    }
  });
});
