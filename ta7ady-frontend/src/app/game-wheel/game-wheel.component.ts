import { Component, ElementRef, ViewChild, computed, inject, signal } from '@angular/core';
import { GameHeaderComponent } from '../shared/game-header/game-header.component';
import type { GameId, GameOption } from '../shared/game-catalog';
import { ThemeService } from '../services/theme.service';
import { GameWheelStateService } from './game-wheel-state.service';

interface WheelSegment {
  readonly game: GameOption;
  readonly path: string;
  readonly labelTransform: string;
  readonly labelLines: readonly WheelLabelLine[];
  readonly colorClass: string;
  readonly labelClass: string;
}

interface WheelLabelLine {
  readonly text: string;
  readonly dy: string;
}

const POINTER_ANGLE = -90;

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

function createLabelLines(name: string): readonly WheelLabelLine[] {
  const words = name.split(/\s+/);
  const firstLineOffset = -((words.length - 1) / 2);
  return words.map((text, index) => ({
    text,
    dy: index === 0 ? `${firstLineOffset}em` : '1em',
  }));
}

function createWheelSegments(games: readonly GameOption[]): readonly WheelSegment[] {
  if (games.length === 0) return [];

  const sliceAngle = 360 / games.length;
  return games.map((game, index) => {
    const startAngle = POINTER_ANGLE + index * sliceAngle;
    const endAngle = startAngle + sliceAngle;
    const middleAngle = (startAngle + endAngle) / 2;
    const [labelX, labelY] = pointOnWheel(middleAngle, 112);

    return {
      game,
      path: segmentPath(startAngle, endAngle),
      labelTransform: `translate(${labelX} ${labelY})`,
      labelLines: createLabelLines(game.name),
      colorClass: `sector-${index % 2}`,
      labelClass: `label-${index % 2}`,
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
  private readonly themeService = inject(ThemeService);
  readonly isDarkTheme = computed(() => this.themeService.theme() !== 'sand');
  readonly wheelRotation = signal(0);
  readonly isSpinning = signal(false);
  readonly pendingWinner = signal<GameOption | null>(null);
  readonly showWinnerPopup = signal(false);
  readonly winnerPopupGame = computed(() => (this.showWinnerPopup() ? this.pendingWinner() : null));
  readonly labelCounterRotation = computed(() => (this.isSpinning() ? 0 : -this.wheelRotation()));
  private readonly displayGames = signal<readonly GameOption[]>(this.state.remainingGames());
  private activeWinnerDialog: HTMLDialogElement | null = null;
  readonly wheelSegments = computed(() => createWheelSegments(this.displayGames()));
  readonly wheelDescription = computed(
    () => `عجلة الحظ، ${this.displayGames().length} ألعاب متاحة`,
  );

  @ViewChild('winnerDialog')
  set winnerDialog(element: ElementRef<HTMLDialogElement> | undefined) {
    const dialog = element?.nativeElement ?? null;
    this.activeWinnerDialog = dialog;
    if (!dialog || dialog.open) return;

    if (typeof dialog.showModal === 'function') {
      dialog.showModal();
      return;
    }
    dialog.setAttribute('open', '');
  }

  removeGame(gameId: GameId): void {
    if (this.pendingWinner()) return;
    this.state.removeGame(gameId);
    this.displayGames.set(this.state.remainingGames());
  }

  restoreGame(gameId: GameId): void {
    if (this.pendingWinner()) return;
    this.state.restoreRemovedGame(gameId);
    this.displayGames.set(this.state.remainingGames());
  }

  spin(): void {
    if (this.pendingWinner()) return;

    const gamesBeforeSpin = this.state.remainingGames();
    const winner = this.state.chooseWinner();
    if (!winner) return;

    this.pendingWinner.set(winner);
    this.showWinnerPopup.set(false);
    if (prefersReducedMotion()) {
      this.wheelRotation.set(0);
      this.isSpinning.set(false);
      this.showWinnerPopup.set(true);
      return;
    }

    const winnerIndex = gamesBeforeSpin.findIndex((game) => game.id === winner.id);
    const sliceAngle = 360 / gamesBeforeSpin.length;
    const winnerCenterAngle = POINTER_ANGLE + (winnerIndex + 0.5) * sliceAngle;
    const targetAngle = (POINTER_ANGLE - winnerCenterAngle + 360) % 360;
    const currentAngle = this.wheelRotation();
    const currentRemainder = ((currentAngle % 360) + 360) % 360;
    const finalTurn = (targetAngle - currentRemainder + 360) % 360;

    this.isSpinning.set(true);
    this.wheelRotation.set(currentAngle + 1440 + finalTurn);
  }

  finishWheelSpin(): void {
    if (!this.pendingWinner()) return;

    this.isSpinning.set(false);
    this.showWinnerPopup.set(true);
  }

  closeWinnerPopup(): void {
    const winner = this.pendingWinner();
    if (!winner) return;

    this.dismissWinnerDialog();
    this.state.pickWinner(winner.id);
    this.displayGames.set(this.state.remainingGames());
    this.pendingWinner.set(null);
    this.showWinnerPopup.set(false);
    this.isSpinning.set(false);
  }

  handleWinnerDialogClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) this.closeWinnerPopup();
  }

  handleWinnerDialogCancel(event: Event): void {
    event.preventDefault();
    this.closeWinnerPopup();
  }

  resetRound(): void {
    this.dismissWinnerDialog();
    this.state.resetRound();
    this.displayGames.set(this.state.remainingGames());
    this.pendingWinner.set(null);
    this.showWinnerPopup.set(false);
    this.isSpinning.set(false);
    this.wheelRotation.set(0);
  }

  private dismissWinnerDialog(): void {
    const dialog = this.activeWinnerDialog;
    if (!dialog?.open) return;

    if (typeof dialog.close === 'function') {
      dialog.close();
      return;
    }
    dialog.removeAttribute('open');
  }
}
