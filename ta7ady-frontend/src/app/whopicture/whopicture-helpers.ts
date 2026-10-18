// Who-in-Picture pure helpers (SPECV4 §4.4): game constants, name-slot
// keys, and the two share paths to the room (URL and image itself). The
// native share sheet is always the first attempt; clipboard copy is only
// the last fallback. No Angular here — the page composes these with signals.

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

/** Share payload: the photo title + hotlink — never the 11 names. */
export function sharePayload(title: string, url: string): ShareDataLite {
  return { title: `مين في الصورة؟ — ${title}`, url };
}

export type SharePath = 'sheet' | 'copied' | 'failed';

/** Narrow slice of ShareData so every browser path compiles alike. */
export interface ShareDataLite {
  title?: string;
  url?: string;
  files?: File[];
}

export interface ShareCapableNavigator {
  share?: (data: ShareDataLite) => Promise<void>;
  canShare?: (data: ShareDataLite) => boolean;
  clipboard?: { writeText(text: string): Promise<void> };
}

function isAbort(err: unknown): boolean {
  return (err as { name?: string })?.name === 'AbortError';
}

async function copyUrl(url: string, nav: ShareCapableNavigator): Promise<SharePath> {
  if (!nav.clipboard) return 'failed';
  try {
    await nav.clipboard.writeText(url);
    return 'copied';
  } catch {
    return 'failed';
  }
}

/** Shares the link: native sheet when the browser has one, else copy. A
 * referee back-out (AbortError) counts as shared: nothing else was wanted. */
export async function sharePhotoUrl(
  url: string,
  title: string,
  nav: ShareCapableNavigator,
): Promise<SharePath> {
  if (typeof nav.share === 'function') {
    try {
      await nav.share(sharePayload(title, url));
      return 'sheet';
    } catch (err) {
      if (isAbort(err)) return 'sheet';
    }
  }
  return copyUrl(url, nav);
}

/** Shares the image itself: fetches the hotlink, builds a File and opens the
 * sheet when `canShare` accepts files; a refusal or a failed fetch falls back
 * to copying the link — never straight to a silent nothing. */
export async function sharePhotoImage(
  url: string,
  title: string,
  nav: ShareCapableNavigator,
  doFetch: typeof fetch = fetch,
): Promise<SharePath> {
  if (typeof nav.share !== 'function') return copyUrl(url, nav);
  const file = await imageFile(url, doFetch);
  if (
    file &&
    typeof nav.canShare === 'function' &&
    nav.canShare({ files: [file] }) &&
    typeof nav.share === 'function'
  ) {
    try {
      await nav.share({ files: [file], title: `مين في الصورة؟ — ${title}` });
      return 'sheet';
    } catch (err) {
      if (isAbort(err)) return 'sheet';
    }
  }
  return copyUrl(url, nav);
}

async function imageFile(url: string, doFetch: typeof fetch): Promise<File | null> {
  try {
    const res = await doFetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    if (!blob.type.startsWith('image/')) return null;
    return new File([blob], fileNameOf(url), { type: blob.type });
  } catch {
    return null;
  }
}

function fileNameOf(url: string): string {
  const tail = (url.split(/[?#]/)[0].split('/').pop() ?? '').trim();
  if (!tail) return 'photo.jpg';
  try {
    return decodeURIComponent(tail);
  } catch {
    return tail;
  }
}
