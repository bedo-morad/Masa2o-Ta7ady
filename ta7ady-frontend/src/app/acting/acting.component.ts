import { CountSelectorComponent } from '../shared/draw-controls/count-selector.component';
import { GameHeaderComponent } from '../shared/game-header/game-header.component';
import { Component, signal } from '@angular/core';
import { ScoreboardComponent } from '../shared/scoreboard/scoreboard.component';
import { TimerComponent } from '../shared/timer/timer.component';
import { PlayerDeckComponent } from '../shared/player-deck/player-deck.component';

@Component({
  selector: 'app-acting',
  standalone: true,
  imports: [GameHeaderComponent, CountSelectorComponent, ScoreboardComponent, TimerComponent, PlayerDeckComponent],
  templateUrl: './acting.component.html',
  styleUrl: './acting.component.scss',
})
export class ActingComponent {
  readonly teamA = signal('');
  readonly teamB = signal('');
  readonly scoreA = signal(0);
  readonly scoreB = signal(0);
  readonly count = signal(10);
}
