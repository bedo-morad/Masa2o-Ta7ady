import { Component, computed, inject, signal } from '@angular/core';
import { GameHeaderComponent } from '../shared/game-header/game-header.component';
import type { GameId, GameOption } from '../shared/game-catalog';
import { GameWheelStateService } from './game-wheel-state.service';

interface WheelSegment {
  readonly game: GameOption;
  readonly path: string;
  readonly labelTransform: string;
  readonly colorClass: string;
  readonly labelClass: string;
}

function pointOnWheel(angle: number, radius: number): readonly [number, number] {
  const radians = (angle * Math.PI) / 180;
  return [180 + Math.cos(radians) * radius, 180 + Math.sin(radians) * radius];
}

function segmentPath(startAngle: number, endAngle: number): string {
  if (endAngle - startAngle >= 360) {
    return 'M 180 180 L 180 12 A 168 168 0 1 1 180 348 A 168 168 0 1 1 180 12 Z';
  }

  const [startX, startY] = pointOnWheel(startAngle, 168);
  const [endX, endY] = pointOnWheel(endAngle, 168);
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  return `M 180 180 L ${startX} ${startY} A 168 168 0 ${largeArc} 1 ${endX} ${endY} Z`;
}

function readableRotation(angle: number): number {
  const normalized = ((angle % 360) + 360) % 360;
  return normalized > 90 && normalized < 270 ? (normalized + 180) % 360 : normalized;
}

function createWheelSegments(games: readonly GameOption[]): readonly WheelSegment[] {
  if (games.length === 0) return [];

  const sliceAngle = 360 / games.length;
  return games.map((game, index) => {
    const startAngle = -90 + index * sliceAngle;
    const endAngle = startAngle + sliceAngle;
    const middleAngle = (startAngle + endAngle) / 2;
    const [labelX, labelY] = pointOnWheel(middleAngle, 112);
    const labelAngle = readableRotation(middleAngle + 90);

    return {
      game,
      path: segmentPath(startAngle, endAngle),
      labelTransform: `translate(${labelX} ${labelY}) rotate(${labelAngle})`,
      colorClass: `sector-${index % 4}`,
      labelClass: `label-${index % 4}`,
    };
  });
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

@Component({
  selector: 'app-game-wheel',
  standalone: true,
  imports: [GameHeaderComponent],
  templateUrl: './game-wheel.component.html',
  styleUrl: './game-wheel.component.scss',
})
export class GameWheelComponent {
  readonly state = inject(GameWheelStateService);
  readonly wheelRotation = signal(0);
  readonly lastWinner = signal<GameOption | null>(null);
  private readonly wheelGames = signal<readonly GameOption[]>(this.state.remainingGames());
  readonly wheelSegments = computed(() => createWheelSegments(this.wheelGames()));
  readonly wheelDescription = computed(
    () => `عجلة الألعاب، ${this.wheelGames().length} ألعاب متاحة`,
  );

  removeGame(gameId: GameId): void {
    this.state.removeGame(gameId);
    this.wheelGames.set(this.state.remainingGames());
  }

  spin(): void {
    const gamesBeforeSpin = this.state.remainingGames();
    const winner = this.state.spin();
    if (!winner) return;

    const winnerIndex = gamesBeforeSpin.findIndex((game) => game.id === winner.id);
    const sliceAngle = 360 / gamesBeforeSpin.length;
    const targetAngle = (360 - (winnerIndex + 0.5) * sliceAngle + 360) % 360;
    const currentAngle = this.wheelRotation();
    const currentRemainder = ((currentAngle % 360) + 360) % 360;
    const finalTurn = (targetAngle - currentRemainder + 360) % 360;

    this.wheelGames.set(gamesBeforeSpin);
    this.wheelRotation.set(currentAngle + 1440 + finalTurn);
    this.lastWinner.set(winner);

    if (prefersReducedMotion()) {
      this.wheelRotation.set(0);
      this.wheelGames.set(this.state.remainingGames());
    }
  }

  finishWheelSpin(): void {
    this.wheelGames.set(this.state.remainingGames());
  }

  resetRound(): void {
    this.state.resetRound();
    this.wheelGames.set(this.state.remainingGames());
    this.lastWinner.set(null);
    this.wheelRotation.set(0);
  }
}
