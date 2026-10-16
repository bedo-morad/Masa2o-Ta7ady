import type { AssignedTeam } from './attribution.component';

// Top-10 rank scoring (RULES.md Top 10): rank N (1-10) = N pts; 11/12/13 =
// -1/-2/-3. Holding all three of 11+12+13 flips the trio from -6 to +6.
// One implementation shared by every attribution-mode: 'rank' host; the page
// itself keeps its booked-effective bookkeeping (see top10.component.ts).

/** Points a single rank is worth on its own. */
export function rankValue(rank: number): number {
  if (rank <= 10) return rank;
  if (rank === 11) return -1;
  if (rank === 12) return -2;
  return -3;
}

export type RankMap = Record<number, AssignedTeam>;

/** The team (if any) holding all three negative ranks 11+12+13. */
export function trioHolder(m: RankMap): AssignedTeam {
  const a = m[11];
  if (a && a === m[12] && a === m[13]) return a;
  return null;
}

/** A team's whole-list contribution: naive rank values + the trio flip
 * (+12 over the -6 the three negatives sum to alone). */
export function teamContribution(m: RankMap, team: 'A' | 'B'): number {
  let s = 0;
  for (let r = 1; r <= 13; r++) if (m[r] === team) s += rankValue(r);
  if (trioHolder(m) === team) s += 12;
  return s;
}
