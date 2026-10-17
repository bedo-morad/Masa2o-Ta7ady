// Pure Ana Meen game shape (SPECV4 §4.2) — no Angular here, spec-friendly.

export const ANAMEEN_CLUES = 5;
export const ANAMEEN_COUNTS: readonly number[] = [1, 3, 5, 10];
export const ANAMEEN_COUNT_DEFAULT = 3;
export const ANAMEEN_POINTS = 1;

export type AnameenTeam = 'A' | 'B';

/** The next clue to open: clue 1 ships revealed, 5 is the last. */
export function nextReveal(current: number): number {
  return Math.min(ANAMEEN_CLUES, current + 1);
}

/** True while at least one clue is still sealed. */
export function canReveal(current: number): boolean {
  return current < ANAMEEN_CLUES;
}
