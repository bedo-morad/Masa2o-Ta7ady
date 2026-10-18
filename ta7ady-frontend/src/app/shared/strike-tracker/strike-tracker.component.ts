import { Component, computed, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';

// Shared strike tracker (SPECV4 §4.4): per-player mistake slots with
// increment / decrement / reset buttons plus an eliminated flag at the
// game's threshold. Referee-owned and display-only: it never writes scores
// and stays out of the audit strip — the hosting page owns the state and
// applies the emitted changes. Score-sheet uses threshold 3, Who-picture 2.

export interface StrikeSlot {
  name: string;
  mistakes: number;
}

/** A referee bump on one slot: `delta` is +1 or -1. */
export interface StrikeBump {
  index: number;
  delta: number;
}

/** A referee rename of one slot (the name field stays editable). */
export interface StrikeRename {
  index: number;
  name: string;
}

/** Sits out once the mistake count reaches the game's threshold. */
export function isEliminated(slot: StrikeSlot, threshold: number): boolean {
  return slot.mistakes >= threshold;
}

/** Keeps a resulting mistake count inside the 0..threshold window. */
export function clampMistakes(value: number, threshold: number): number {
  return Math.min(threshold, Math.max(0, value));
}

@Component({
  selector: 'app-strike-tracker',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './strike-tracker.component.html',
  styleUrl: './strike-tracker.component.scss',
})
export class StrikeTrackerComponent {
  readonly slots = input.required<StrikeSlot[]>();
  /** Mistakes that sit a player out: 3 in Score-sheet, 2 in Who-picture. */
  readonly eliminationThreshold = input(3);

  readonly bump = output<StrikeBump>();
  readonly reset = output<number>();
  readonly rename = output<StrikeRename>();

  readonly anySlot = computed(() => this.slots().length > 0);

  out(i: number): boolean {
    return isEliminated(this.slots()[i], this.eliminationThreshold());
  }

  canGoDown(i: number): boolean {
    return this.slots()[i].mistakes > 0;
  }

  canGoUp(i: number): boolean {
    return !this.out(i);
  }

  bumpDown(i: number): void {
    this.bump.emit({ index: i, delta: -1 });
  }

  bumpUp(i: number): void {
    this.bump.emit({ index: i, delta: 1 });
  }

  resetSlot(i: number): void {
    this.reset.emit(i);
  }

  retitle(i: number, name: string): void {
    this.rename.emit({ index: i, name });
  }
}
