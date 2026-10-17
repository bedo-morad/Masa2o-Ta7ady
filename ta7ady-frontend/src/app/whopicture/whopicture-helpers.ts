// Who-in-Picture pure helpers (SPECV4 §4.4): game constants, name-slot
// keys, and the share-with-the-room path. No Angular here — the page
// component composes these with its own signals.

import { AssignedTeam } from '../shared/attribution/attribution.component';

export const WHO_STRIKES_OUT = 2;
export const WHO_MAX_PHOTOS = 5; // draw clamp; 1 photo is a full game

export type NameMap = Record<string, AssignedTeam>; // "p3" -> team

export function nameKey(i: number): string {
  return `p${i}`;
}

export function countAssigned(m: NameMap, team: 'A' | 'B'): number {
  let n = 0;
  for (const t of Object.values(m)) if (t === team) n += 1;
  return n;
}

/** Share payload: the hotlink only — never the covered names. */
export function sharePayload(url: string): { title: string; url: string } {
  return { title: 'مين في الصورة؟', url };
}

export type SharePath = 'sheet' | 'copied';

export interface ShareCapableNavigator {
  share?: (data: { title: string; url: string }) => Promise<void>;
  clipboard?: { writeText(text: string): Promise<void> };
}

function isAbort(err: unknown): boolean {
  return (err as { name?: string })?.name === 'AbortError';
}

/** Native sheet when the browser has one; otherwise copy the link. A referee
 * back-out (AbortError) counts as shared: nothing else was wanted. */
export async function sharePhotoUrl(
  url: string,
  nav: ShareCapableNavigator,
): Promise<SharePath> {
  if (typeof nav.share === 'function') {
    try {
      await nav.share(sharePayload(url));
      return 'sheet';
    } catch (err) {
      if (isAbort(err)) return 'sheet';
    }
  }
  await nav.clipboard!.writeText(url);
  return 'copied';
}
