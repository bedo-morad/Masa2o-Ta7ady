import { TestBed } from '@angular/core/testing';
import { ScoreboardComponent } from './scoreboard.component';

describe('ScoreboardComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [ScoreboardComponent] }).compileComponents();
  });

  it('creates', () => {
    const fixture = TestBed.createComponent(ScoreboardComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
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
