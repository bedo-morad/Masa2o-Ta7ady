import { Component, ElementRef, ViewChild, computed, inject, signal } from '@angular/core';
import { GameHeaderComponent } from '../shared/game-header/game-header.component';
import type { GameId, GameOption } from '../shared/game-catalog';
import { GameStatePanelComponent } from './game-state-panel/game-state-panel.component';
import { GameWheelStateService } from './state/game-wheel-state.service';
import { rotationForWinner } from './geometry/wheel-geometry';
import { WheelDiscComponent } from './wheel-disc/wheel-disc.component';

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
  imports: [GameHeaderComponent, GameStatePanelComponent, WheelDiscComponent],
  templateUrl: './game-wheel.component.html',
  styleUrl: './game-wheel.component.scss',
})
export class GameWheelComponent {
  readonly state = inject(GameWheelStateService);
  readonly wheelRotation = signal(0);
  readonly isSpinning = signal(false);
  readonly pendingWinner = signal<GameOption | null>(null);
  readonly winnerPopupGame = computed(() => (this.isSpinning() ? null : this.pendingWinner()));
  private activeWinnerDialog: HTMLDialogElement | null = null;

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
  }

  restoreGame(gameId: GameId): void {
    if (this.pendingWinner()) return;
    this.state.restoreRemovedGame(gameId);
  }

  spin(): void {
    if (this.pendingWinner()) return;

    const gamesBeforeSpin = this.state.remainingGames();
    const winner = this.state.chooseWinner();
    if (!winner) return;

    const targetRotation = rotationForWinner(gamesBeforeSpin, winner.id, this.wheelRotation());
    if (targetRotation === null) return;

    this.pendingWinner.set(winner);
    if (prefersReducedMotion()) {
      this.wheelRotation.set(0);
      this.isSpinning.set(false);
      return;
    }

    this.isSpinning.set(true);
    this.wheelRotation.set(targetRotation);
  }

  finishWheelSpin(): void {
    if (!this.pendingWinner()) return;
    this.isSpinning.set(false);
  }

  closeWinnerPopup(): void {
    const winner = this.pendingWinner();
    if (!winner) return;

    this.dismissWinnerDialog();
    this.state.pickWinner(winner.id);
    this.pendingWinner.set(null);
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
    this.pendingWinner.set(null);
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
