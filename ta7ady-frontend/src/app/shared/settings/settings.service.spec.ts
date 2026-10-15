import { TestBed } from '@angular/core/testing';
import { SettingsService } from './settings.service';

describe('SettingsService', () => {
  let svc: SettingsService;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({}).compileComponents();
    svc = TestBed.inject(SettingsService);
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('starts with sane defaults', () => {
    expect(svc.alarmSoundId()).toBe('classic');
    expect(svc.alarmVolume()).toBe(5);
    expect(svc.vibrateOnTimeout()).toBe(true);
    expect(svc.teamA()).toBe('');
    expect(svc.teamB()).toBe('');
    expect(svc.playersA()).toEqual(['', '']);
    expect(svc.playersB()).toEqual(['', '']);
  });

  it('persists sound, volume, teams and players to ta7ady-* keys', () => {
    svc.setAlarmSound('triplet');
    svc.setAlarmVolume(8);
    svc.setTeamA('الصقور');
    svc.setTeamB('النسور');
    svc.setPlayer('A', 0, 'أحمد');
    svc.setPlayer('B', 1, 'سارة');

    expect(localStorage.getItem('ta7ady-alarm-sound')).toBe('triplet');
    expect(localStorage.getItem('ta7ady-alarm-volume')).toBe('8');
    expect(localStorage.getItem('ta7ady-team-a')).toBe('الصقور');
    expect(localStorage.getItem('ta7ady-team-b')).toBe('النسور');
    expect(JSON.parse(localStorage.getItem('ta7ady-players-a')!)).toEqual(['أحمد', '']);
    expect(JSON.parse(localStorage.getItem('ta7ady-players-b')!)).toEqual(['', 'سارة']);

    // A fresh instance picks up the stored values.
    const fresh = TestBed.runInInjectionContext(() => new SettingsService());
    expect(fresh.alarmSoundId()).toBe('triplet');
    expect(fresh.alarmVolume()).toBe(8);
    expect(fresh.teamA()).toBe('الصقور');
    expect(fresh.playersA()).toEqual(['أحمد', '']);
  });

  it('clamps volume to 0–10', () => {
    svc.setAlarmVolume(-3);
    expect(svc.alarmVolume()).toBe(0);
    svc.setAlarmVolume(99);
    expect(svc.alarmVolume()).toBe(10);
  });

  it('timerSeconds falls back until an override is set', () => {
    expect(svc.timerSeconds('password', 60)).toBe(60);
    svc.setTimerOverride('password', 45);
    expect(svc.timerSeconds('password', 60)).toBe(45);
    // Other keys are unaffected.
    expect(svc.timerSeconds('acting', 30)).toBe(30);
  });

  it('clearing an override (null) restores the fallback', () => {
    svc.setTimerOverride('ihbid', 20);
    expect(svc.timerSeconds('ihbid', 90)).toBe(20);
    svc.setTimerOverride('ihbid', null);
    expect(svc.timerSeconds('ihbid', 90)).toBe(90);
  });

  it('persists the vibrate toggle and defaults it to on', () => {
    expect(svc.vibrateOnTimeout()).toBe(true);
    svc.setVibrate(false);
    expect(svc.vibrateOnTimeout()).toBe(false);
    expect(localStorage.getItem('ta7ady-vibrate')).toBe('0');
    const fresh = TestBed.runInInjectionContext(() => new SettingsService());
    expect(fresh.vibrateOnTimeout()).toBe(false);
    svc.setVibrate(true);
    expect(localStorage.getItem('ta7ady-vibrate')).toBe('1');
  });

  it('resetAll restores every default', () => {
    svc.setAlarmSound('gong');
    svc.setAlarmVolume(10);
    svc.setVibrate(false);
    svc.setTeamA('x');
    svc.setPlayer('A', 1, 'y');
    svc.setTimerOverride('top10', 12);
    svc.setTheme('sand');

    svc.resetAll();

    expect(svc.alarmSoundId()).toBe('classic');
    expect(svc.alarmVolume()).toBe(5);
    expect(svc.vibrateOnTimeout()).toBe(true);
    expect(svc.teamA()).toBe('');
    expect(svc.playersA()).toEqual(['', '']);
    expect(svc.timerSeconds('top10', 60)).toBe(60);
    expect(svc.theme()).toBe('lapis');
  });
});
