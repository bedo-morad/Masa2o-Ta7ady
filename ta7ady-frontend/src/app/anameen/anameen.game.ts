// Pure Ana Meen game shape (SPECV4 §4.2) — no Angular here, spec-friendly.
// All five clues ship visible; there is no reveal state to model.

export const ANAMEEN_CLUES = 5;
export const ANAMEEN_COUNTS: readonly number[] = [1, 3, 5, 10];
export const ANAMEEN_COUNT_DEFAULT = 3;
export const ANAMEEN_POINTS = 1;

export type AnameenTeam = 'A' | 'B';
