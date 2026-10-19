import { Component, input, output } from '@angular/core';
import { AssignedTeam } from '../../shared/attribution/attribution.component';
import { ScoresheetMatch } from '../../api.service';

export type Side = 'A' | 'B';
export type PlayerMap = Record<string, AssignedTeam>;
export interface ScoresheetPlayerToggle {
  side: Side;
  index: number;
  player: string;
}

export function playerKey(side: Side, index: number): string {
  return `${side}:${index}`;
}

@Component({
  selector: 'app-scoresheet-lineups',
  standalone: true,
  templateUrl: './scoresheet-lineups.component.html',
  styleUrl: './scoresheet-lineups.component.scss',
})
export class ScoresheetLineupsComponent {
  readonly match = input.required<ScoresheetMatch>();
  readonly assignments = input.required<PlayerMap>();
  readonly playerToggle = output<ScoresheetPlayerToggle>();

  assigned(side: Side, index: number): AssignedTeam {
    return this.assignments()[playerKey(side, index)] ?? null;
  }

  toggle(side: Side, index: number, player: string): void {
    this.playerToggle.emit({ side, index, player });
  }
}
