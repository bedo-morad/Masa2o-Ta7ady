import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import {
  NameMap,
  WhopictureComponent,
  nameKey,
  sharePayload,
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
  it('carries the hotlink only, never the covered names', () => {
    const p = sharePayload('https://example.com/team.jpg');
    expect(p).toEqual({ title: 'مين في الصورة؟', url: 'https://example.com/team.jpg' });
    expect(Object.values(p)).not.toContain('لاعب');
  });
});

describe('sharePhotoUrl', () => {
  const clipboard = { writeText: (t: string) => Promise.resolve() };

  it('uses the native sheet when the API exists', async () => {
    const shared: unknown[] = [];
    const out = await sharePhotoUrl('u1', {
      share: (d) => (shared.push(d), Promise.resolve()),
      clipboard,
    });
    expect(out).toBe('sheet');
    expect(shared.length).toBe(1);
  });

  it('copies the link when there is no native share API', async () => {
    const copied: string[] = [];
    const out = await sharePhotoUrl('u2', {
      clipboard: { writeText: (t) => (copied.push(t), Promise.resolve()) },
    });
    expect(out).toBe('copied');
    expect(copied).toEqual(['u2']);
  });

  it('still shares (back-out) when the referee dismisses the sheet', async () => {
    const out = await sharePhotoUrl('u3', {
      share: () => Promise.reject(Object.assign(new Error('x'), { name: 'AbortError' })),
      clipboard,
    });
    expect(out).toBe('sheet');
  });

  it('falls back to the clipboard when the sheet fails to open', async () => {
    const copied: string[] = [];
    const out = await sharePhotoUrl('u4', {
      share: () => Promise.reject(new Error('denied')),
      clipboard: { writeText: (t) => (copied.push(t), Promise.resolve()) },
    });
    expect(out).toBe('copied');
    expect(copied).toEqual(['u4']);
  });
});

describe('WhopictureComponent', () => {
  const photo = (id: number): WhoPicturePhoto => ({
    id,
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
    const fixture = TestBed.createComponent(WhopictureComponent);
    fixture.detectChanges();
    const c = fixture.componentInstance;
    c.photos.set([photo(1)]);
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

  it('names stay covered until attributed, then reveal', () => {
    const c = setup();
    expect(c.revealed(1, 3)).toBe(false);
    pick(c, 3, 'B');
    expect(c.revealed(1, 3)).toBe(true);
    expect(c.assigned(1, 3)).toBe('B');
  });

  it('each attributed name books exactly +1 to the picked team', () => {
    const c = setup();
    pick(c, 0, 'A');
    pick(c, 2, 'A');
    pick(c, 5, 'B');
    expect(c.scoreA()).toBe(2);
    expect(c.scoreB()).toBe(1);
  });

  it('tapping the same team again unassigns, re-covers and reverses exactly', () => {
    const c = setup();
    pick(c, 0, 'A');
    pick(c, 0, 'A');
    expect(c.scoreA()).toBe(0);
    expect(c.assigned(1, 0)).toBeNull();
    expect(c.revealed(1, 0)).toBe(false);
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
    expect(c.audit()[0]).toEqual(
      expect.objectContaining({ team: 'B', delta: 1, label: 'لعب8' }),
    );
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

  it('shareCurrent copies the open photo link when no native sheet exists', async () => {
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
      await c.shareCurrent();
    } finally {
      delete (navigator as unknown as { share?: unknown; clipboard?: unknown }).share;
      delete (navigator as unknown as { clipboard?: unknown }).clipboard;
    }
    expect(copied).toEqual(['https://example.com/1.jpg']);
    expect(c.msg()).toContain('تم نسخ');
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
