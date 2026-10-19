import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ScoresheetMatch } from '../../services/api.service';
import {
  PlayerMap,
  ScoresheetLineupsComponent,
  ScoresheetPlayerToggle,
} from './scoresheet-lineups.component';

@Component({
  standalone: true,
  imports: [ScoresheetLineupsComponent],
  template: `
    <app-scoresheet-lineups
      [match]="match"
      [assignments]="assignments()"
      (playerToggle)="toggle = $event"
    />
  `,
})
class HostComponent {
  match: ScoresheetMatch = {
    id: 1,
    matchLabel: 'نهائي',
    teamA: 'طرف أول',
    teamB: 'طرف ثان',
    lineupA: ['ليوناردو بونوتشي'],
    lineupB: ['فيديريكو بالزاريتي'],
  };
  assignments = signal<PlayerMap>({});
  toggle: ScoresheetPlayerToggle | null = null;
}

describe('ScoresheetLineupsComponent', () => {
  let fixture: ComponentFixture<HostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [HostComponent] }).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
  });

  it('renders both lineups with exact player labels and emits semantic toggles', () => {
    const host = fixture.componentInstance;
    const sides = fixture.nativeElement.querySelectorAll('.side') as NodeListOf<HTMLElement>;
    expect(sides).toHaveLength(2);
    expect(sides[0].querySelector('.pname')?.textContent).toBe(host.match.lineupA[0]);
    expect(sides[1].querySelector('.pname')?.textContent).toBe(host.match.lineupB[0]);

    (sides[0].querySelector('.prow') as HTMLButtonElement).click();
    expect(host.toggle).toEqual({ side: 'A', index: 0, player: 'ليوناردو بونوتشي' });
    (sides[1].querySelector('.prow') as HTMLButtonElement).click();
    expect(host.toggle).toEqual({ side: 'B', index: 0, player: 'فيديريكو بالزاريتي' });
  });

  it('reflects assignments by side and index', () => {
    fixture.componentInstance.assignments.set({ 'A:0': 'A', 'B:0': 'B' });
    fixture.detectChanges();
    const buttons = fixture.nativeElement.querySelectorAll('.prow') as NodeListOf<HTMLButtonElement>;
    expect(buttons[0].getAttribute('aria-pressed')).toBe('true');
    expect(buttons[1].getAttribute('aria-pressed')).toBe('true');
  });
});
