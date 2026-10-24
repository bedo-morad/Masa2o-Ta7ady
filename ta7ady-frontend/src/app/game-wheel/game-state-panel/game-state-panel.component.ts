import { Component, input, output } from '@angular/core';
import type { GameId, GameOption } from '../../shared/game-catalog';

@Component({
  selector: 'app-game-state-panel',
  standalone: true,
  templateUrl: './game-state-panel.component.html',
  styleUrl: './game-state-panel.component.scss',
})
export class GameStatePanelComponent {
  readonly remainingGames = input.required<readonly GameOption[]>();
  readonly removedGames = input.required<readonly GameOption[]>();
  readonly pickedGames = input.required<readonly GameOption[]>();

  readonly removeGame = output<GameId>();
  readonly restoreGame = output<GameId>();
  readonly resetRound = output<void>();
}
