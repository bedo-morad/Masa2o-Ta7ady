import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import {
  NameMap,
  WhopictureComponent,
  nameKey,
  sharePayload,
  sharePhotoImage,
  sharePhotoUrl,
} from './whopicture.component';
import { WhoPicturePhoto } from '../api.service';
import { SettingsService } from '../shared/settings/settings.service';

describe('nameKey', () => {
  it('keys the 11 slots by photo-internal index', () => {
    expect(nameKey(0)).toBe('p0');
    expect(nameKey(10)).toBe('p10');
  });
});

describe('sharePayload', () => {
  it('carries the photo title + hotlink, never the 11 names', () => {
    const p = sharePayload('الأهلي 2021', 'https://example.com/team.jpg');
    expect(p.title).toBe('مين في الصورة؟ — الأهلي 2021');
    expect(p.url).toBe('https://example.com/team.jpg');
    expect(Object.values(p)).not.toContain('لاعب');
  });
});

describe('sharePhotoUrl', () => {
  const TITLE = 'الأهلي 2021';
  const clipboard = { writeText: (t: string) => Promise.resolve() };

  it('uses the native sheet when the API exists', async () => {
    const shared: unknown[] = [];
    const out = await sharePhotoUrl('u1', TITLE, {
      share: (d) => (shared.push(d), Promise.resolve()),
      clipboard,
    });
    expect(out).toBe('sheet');
    expect(shared.length).toBe(1);
  });

  it('copies the link when there is no native share API', async () => {
    const copied: string[] = [];
    const out = await sharePhotoUrl('u2', TITLE, {
      clipboard: { writeText: (t) => (copied.push(t), Promise.resolve()) },
    });
    expect(out).toBe('copied');
    expect(copied).toEqual(['u2']);
  });

  it('still shares (back-out) when the referee dismisses the sheet', async () => {
    const out = await sharePhotoUrl('u3', TITLE, {
      share: () => Promise.reject(Object.assign(new Error('x'), { name: 'AbortError' })),
      clipboard,
    });
    expect(out).toBe('sheet');
  });

  it('falls back to the clipboard when the sheet fails to open', async () => {
    const copied: string[] = [];
    const out = await sharePhotoUrl('u4', TITLE, {
      share: () => Promise.reject(new Error('denied')),
      clipboard: { writeText: (t) => (copied.push(t), Promise.resolve()) },
    });
    expect(out).toBe('copied');
    expect(copied).toEqual(['u4']);
  });

  it('reports failed when neither share nor clipboard exists', async () => {
    const out = await sharePhotoUrl('u5', TITLE, {});
    expect(out).toBe('failed');
  });
});

describe('sharePhotoImage', () => {
  const TITLE = 'الأهلي 2021';
  const blob = new Blob([new Uint8Array(4)], { type: 'image/jpeg' });
  const okFetch = () =>
    Promise.resolve({ ok: true, blob: () => Promise.resolve(blob) } as Response);

  it('opens the native sheet with the image file when canShare accepts files', async () => {
    const shared: unknown[] = [];
    const out = await sharePhotoImage(
      'https://x/p.jpg',
      TITLE,
      {
        share: (d) => (shared.push(d), Promise.resolve()),
        canShare: (d) => Array.isArray(d.files) && d.files.length === 1,
        clipboard: { writeText: () => Promise.resolve() },
      },
      okFetch,
    );
    expect(out).toBe('sheet');
    expect((shared[0] as { files?: File[] }).files?.length).toBe(1);
    expect(shared[0]).toEqual(expect.objectContaining({ title: `مين في الصورة؟ — ${TITLE}` }));
  });

  it('copies the link when canShare refuses files', async () => {
    const copied: string[] = [];
    const out = await sharePhotoImage(
      'https://x/p.jpg',
      TITLE,
      {
        share: () => Promise.resolve(),
        canShare: () => false,
        clipboard: { writeText: (t) => (copied.push(t), Promise.resolve()) },
      },
      okFetch,
    );
    expect(out).toBe('copied');
    expect(copied).toEqual(['https://x/p.jpg']);
  });

  it('copies the link when the fetch fails — image share is best-effort', async () => {
    const copied: string[] = [];
    const bad = () => Promise.reject(new Error('offline'));
    const out = await sharePhotoImage(
      'https://x/p.jpg',
      TITLE,
      {
        share: () => Promise.resolve(),
        canShare: () => true,
        clipboard: { writeText: (t) => (copied.push(t), Promise.resolve()) },
      },
      bad,
    );
    expect(out).toBe('copied');
    expect(copied).toEqual(['https://x/p.jpg']);
  });

  it('copies when there is no share API at all (feature-detected browser)', async () => {
    const copied: string[] = [];
    const out = await sharePhotoImage(
      'https://x/p.jpg',
      TITLE,
      {
        clipboard: { writeText: (t) => (copied.push(t), Promise.resolve()) },
      },
      okFetch,
    );
    expect(out).toBe('copied');
    expect(copied).toEqual(['https://x/p.jpg']);
  });

  it('reports failed when nothing works', async () => {
    const dead = () => Promise.resolve({ ok: false } as Response);
    const out = await sharePhotoImage('https://x/p.jpg', TITLE, {}, dead);
    expect(out).toBe('failed');
  });
});

describe('WhopictureComponent', () => {
  let fixture: ComponentFixture<WhopictureComponent>;

  const el = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const photo = (id: number): WhoPicturePhoto => ({
    id,
    title: 'الأهلي 2021 نهائي دوري أبطال أفريقيا',
    photoUrl: `https://example.com/${id}.jpg`,
    players: Array.from({ length: 11 }, (_, i) => `لعب${i + 1}`),
  });

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WhopictureComponent],
      providers: [provideHttpClient(), provideRouter([])],
    }).compileComponents();
  });

  function setup(): WhopictureComponent {
    fixture = TestBed.createComponent(WhopictureComponent);
    fixture.detectChanges();
    const c = fixture.componentInstance;
    c.photos.set([photo(1)]);
    fixture.detectChanges();
    return c;
  }

  function pick(c: WhopictureComponent, i: number, team: 'A' | 'B'): void {
    const p = photo(1);
    c.onName(p, i, {
      label: p.players[i],
      points: 1,
      picked: team,
      from: c.assigned(1, i),
      to: team,
    });
  }

  it('creates with the draw defaulting to one photo and a 1–5 ceiling', () => {
    const c = setup();
    expect(c).toBeTruthy();
    expect(c.count()).toBe(1);
    expect(c.maxPhotos).toBe(5);
  });

  it('all 11 names are visible from the start — no cover to lift', () => {
    const c = setup();
    for (let i = 0; i < 11; i += 1) {
      expect(c.assigned(1, i)).toBeNull();
    }
    // Still uncovered right after attribution is booked? No — assignment is
    // the state; the text itself is rendered regardless from the very start.
    const view = el();
    expect(view.textContent).toContain('لعب1');
    expect(view.textContent).toContain('لعب11');
    expect((view.textContent ?? '').includes('؟؟')).toBe(false);
  });

  it('the photo title renders above the image, ready or not', () => {
    const c = setup();
    const view = el();
    expect(view.querySelector('.title')?.textContent).toContain('الأهلي 2021');
    expect(c.imageOf(1)).toBe('loading');
    c.markLoaded(1);
    expect(c.imageOf(1)).toBe('ready');
  });

  it('a dead hotlink shows an explicit fallback, never an eternal skeleton', () => {
    const c = setup();
    c.markFailed(1);
    fixture.detectChanges();
    const view = el();
    expect(c.imageOf(1)).toBe('failed');
    expect(view.querySelector('.shot-failed')?.textContent).toContain('تعذّر تحميل الصورة');
    expect(view.querySelector('.shot-skeleton')).toBeNull();
  });

  it('the img error event itself drives the failed fallback', () => {
    setup();
    el().querySelector('img.shot')?.dispatchEvent(new Event('error'));
    fixture.detectChanges();
    expect(el().querySelector('.shot-failed')).toBeTruthy();
  });

  it('ready wins once shown — a later error does not regress a shown photo', () => {
    const c = setup();
    c.markLoaded(1);
    c.markFailed(1);
    expect(c.imageOf(1)).toBe('ready');
  });

  it('award buttons carry the FULL team names, never أ/ب', () => {
    const c = setup();
    c.teamA.set('الصقور');
    c.teamB.set('النمور');
    fixture.detectChanges();
    const view = el();
    const labels = Array.from(view.querySelectorAll('[aria-label]')).map(
      (b) => (b.getAttribute('aria-label') ?? '') + ' ' + b.textContent,
    );
    const joined = labels.join(' ');
    expect(joined).toContain('الصقور');
    expect(joined).toContain('النمور');
  });

  it('both share buttons exist — image and link', () => {
    const c = setup();
    const view = el();
    expect(view.querySelector('[aria-label="مشاركة صورة الفريق نفسها"]')).toBeTruthy();
    expect(view.querySelector('[aria-label="مشاركة رابط الصورة"]')).toBeTruthy();
  });

  it('parent click-through routes rendered attribution to scoring state', () => {
    const c = setup();
    c.teamA.set('الصقور');
    c.teamB.set('النمور');
    fixture.detectChanges();
    (el().querySelector('[aria-label="الصقور"]') as HTMLButtonElement).click();
    expect(c.assigned(1, 0)).toBe('A');
    expect(c.scoreA()).toBe(1);
  });

  it('parent click-through routes both rendered share actions', () => {
    const c = setup();
    const imageShare = vi.spyOn(c, 'shareImage').mockResolvedValue();
    const urlShare = vi.spyOn(c, 'shareUrl').mockResolvedValue();
    el()
      .querySelector('[aria-label="مشاركة صورة الفريق نفسها"]')
      ?.dispatchEvent(new Event('click'));
    el().querySelector('[aria-label="مشاركة رابط الصورة"]')?.dispatchEvent(new Event('click'));
    expect(imageShare).toHaveBeenCalledOnce();
    expect(urlShare).toHaveBeenCalledOnce();
  });

  it('each attributed name books exactly +1 to the picked team', () => {
    const c = setup();
    pick(c, 0, 'A');
    pick(c, 2, 'A');
    pick(c, 5, 'B');
    expect(c.scoreA()).toBe(2);
    expect(c.scoreB()).toBe(1);
  });

  it('tapping the same team again unassigns and reverses exactly', () => {
    const c = setup();
    pick(c, 0, 'A');
    pick(c, 0, 'A');
    expect(c.scoreA()).toBe(0);
    expect(c.assigned(1, 0)).toBeNull();
  });

  it('moving a name from A to B books the full swap (+1 / −1)', () => {
    const c = setup();
    pick(c, 0, 'A');
    pick(c, 0, 'B');
    expect(c.scoreA()).toBe(0);
    expect(c.scoreB()).toBe(1);
    expect(c.assigned(1, 0)).toBe('B');
  });

  it('unassigning after a manual zero lands negative and audits the real delta', () => {
    const c = setup();
    pick(c, 0, 'A');
    c.scoreA.set(0); // referee manually zeroed after the attribution
    pick(c, 0, 'A'); // unassign reverses −1 against booked 1
    expect(c.scoreA()).toBe(-1);
    expect(c.audit().at(-1)).toEqual(expect.objectContaining({ team: 'A', delta: -1 }));
  });

  it('every attribution change appends an audit entry labeled with the name', () => {
    const c = setup();
    pick(c, 7, 'B');
    expect(c.audit().length).toBe(1);
    expect(c.audit()[0]).toEqual(expect.objectContaining({ team: 'B', delta: 1, label: 'لعب8' }));
  });

  it('strikes eliminate at 2 (not 3) and reset clears', () => {
    const c = setup();
    const p = photo(1);
    expect(c.slotsOf(p).length).toBe(4);
    c.bumpSlot(1, 0, 1);
    expect(c.slotsOf(p)[0].mistakes < 2).toBe(true);
    c.bumpSlot(1, 0, 1);
    expect(c.slotsOf(p)[0].mistakes).toBe(2); // sits out now
    expect(c.slotsOf(p)[0].mistakes >= 2).toBe(true);
    c.resetSlot(1, 0);
    expect(c.slotsOf(p)[0].mistakes).toBe(0);
  });

  it('the clamp keeps strikes inside 0..2', () => {
    const c = setup();
    const p = photo(1);
    c.slotsOf(p); // materialize this photo's slots before bumping
    c.bumpSlot(1, 1, 1);
    c.bumpSlot(1, 1, 1);
    c.bumpSlot(1, 1, 1); // at threshold: no third bump
    expect(c.slotsOf(photo(1))[1].mistakes).toBe(2);
    c.bumpSlot(1, 1, -1);
    c.bumpSlot(1, 1, -1);
    c.bumpSlot(1, 1, -1); // at zero: no further decrease
    expect(c.slotsOf(photo(1))[1].mistakes).toBe(0);
  });

  it('strike slots prefill from the settings players and stay editable', () => {
    const c = setup();
    const settings = TestBed.inject(SettingsService);
    try {
      settings.setPlayer('A', 0, 'سامي');
      c.teamA.set('الصقور');
      c.teamB.set('النمور');
      c.strikes.set({});
      const p = photo(1);
      expect(c.slotsOf(p)[0].name).toBe('سامي');
      expect(c.slotsOf(p)[1].name).toBe('الصقور - لاعب ٢');
      expect(c.slotsOf(p)[2].name).toBe('النمور - لاعب ١');
      expect(c.slotsOf(p)[3].name).toBe('النمور - لاعب ٢');
      c.onSlotRename(1, { index: 0, name: 'كابتن' });
      expect(c.slotsOf(p)[0].name).toBe('كابتن');
    } finally {
      settings.resetAll();
    }
  });

  it('shareUrl copies the open photo link when no native sheet exists', async () => {
    const c = setup();
    const copied: string[] = [];
    const stub = { value: undefined as unknown };
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      get: () => ({ writeText: (t: string) => (copied.push(t), Promise.resolve()) }),
    });
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      get: () => stub.value,
    });
    try {
      await c.shareUrl();
    } finally {
      delete (navigator as unknown as { share?: unknown; clipboard?: unknown }).share;
      delete (navigator as unknown as { clipboard?: unknown }).clipboard;
    }
    expect(copied).toEqual(['https://example.com/1.jpg']);
    expect(c.msg()).toContain('تم نسخ');
  });

  it('shareImage falls back to copy + a clear notice when the device refuses files', async () => {
    const c = setup();
    const copied: string[] = [];
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      get: () => ({ writeText: (t: string) => (copied.push(t), Promise.resolve()) }),
    });
    Object.defineProperty(navigator, 'share', { configurable: true, get: () => undefined });
    try {
      await c.shareImage();
    } finally {
      delete (navigator as unknown as { share?: unknown; clipboard?: unknown }).share;
      delete (navigator as unknown as { clipboard?: unknown }).clipboard;
    }
    expect(copied).toEqual(['https://example.com/1.jpg']);
    expect(c.msg()).toContain('بدلًا منها');
  });

  it('navigation stays in bounds', () => {
    const c = setup();
    c.photos.set([photo(1), photo(2)]);
    c.prev();
    expect(c.idx()).toBe(0);
    c.next();
    expect(c.next(), 'second next is capped').toBeUndefined();
    expect(c.idx()).toBe(1);
    expect(c.current()?.id).toBe(2);
    c.prev();
    expect(c.current()?.id).toBe(1);
  });

  it('redraw reverses photos that vanished and keeps the score honest', () => {
    const c = setup();
    pick(c, 0, 'A'); // +1 booked on photo 1
    c.reconcile([photo(2)]); // photo 1 vanished with the redraw
    expect(c.scoreA()).toBe(0);
    expect(c.photos().length).toBe(1);
    expect(c.photos()[0].id).toBe(2);
  });
});

// Booked-effective math reference (shared with Top-10): per photo the page
// tracks the net amount already in the score and steers toward the map's
// contribution, so NameMap targets of +1 per name always land exactly.
describe('NameMap booking reference', () => {
  it('keeps names keyed independently', () => {
    const m: NameMap = { [nameKey(0)]: 'A', [nameKey(1)]: 'B' };
    expect(m['p0']).toBe('A');
    expect(m['p1']).toBe('B');
  });
});
