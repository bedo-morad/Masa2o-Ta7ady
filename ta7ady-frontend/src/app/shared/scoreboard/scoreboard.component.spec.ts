import { TestBed } from '@angular/core/testing';
import { ScoreboardComponent } from './scoreboard.component';
import { SettingsService } from '../../services/settings.service';

describe('ScoreboardComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [ScoreboardComponent] }).compileComponents();
  });

  it('creates', () => {
    const fixture = TestBed.createComponent(ScoreboardComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('prefills empty team names from persisted settings once on init', () => {
    const settings = TestBed.inject(SettingsService);
    settings.setTeamA('الصقور');
    settings.setTeamB('النمور');
    try {
      const fixture = TestBed.createComponent(ScoreboardComponent);
      fixture.detectChanges();
      expect(fixture.componentInstance.teamA()).toBe('الصقور');
      expect(fixture.componentInstance.teamB()).toBe('النمور');
    } finally {
      settings.resetAll();
    }
  });

  it('leaves referee-typed names alone; placeholders fall back to settings', () => {
    const settings = TestBed.inject(SettingsService);
    settings.setTeamA('الصقور');
    try {
      const fixture = TestBed.createComponent(ScoreboardComponent);
      fixture.componentRef.setInput('teamA', 'مكتوب');
      fixture.detectChanges();
      const c = fixture.componentInstance;
      expect(c.teamA()).toBe('مكتوب');
      expect(c.teamB()).toBe('');
      expect(c.placeholderA()).toBe('الصقور');
      expect(c.placeholderB()).toBe('الفريق الثاني');
    } finally {
      settings.resetAll();
    }
  });

  it('bumps scores through the models and allows negative scores', () => {
    const c = TestBed.createComponent(ScoreboardComponent).componentInstance;
    c.scoreA.set(2);
    c.bumpA(1);
    expect(c.scoreA()).toBe(3);
    c.bumpB(-1);
    expect(c.scoreB()).toBe(-1);
    c.bumpA(-10);
    expect(c.scoreA()).toBe(-7);
  });
});
