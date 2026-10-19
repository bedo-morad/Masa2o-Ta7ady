import { CountSelectorComponent } from '../shared/draw-controls/count-selector.component';
import { GameHeaderComponent } from '../shared/game-header/game-header.component';
import { Component, effect, inject, signal } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { API_BASE, WhoPicturePhoto } from '../api.service';
import { ScoreboardComponent } from '../shared/scoreboard/scoreboard.component';
import { TimerComponent } from '../shared/timer/timer.component';
import { ItemNavigationComponent } from '../shared/item-navigation/item-navigation.component';
import { SettingsService } from '../shared/settings/settings.service';
import { ScoreBooking } from '../shared/score-booking';

// Who-in-Picture (SPECV4 §4.4): referee screen over one hotlinked team photo.
// All 11 names stay visible from the start in ONE column; the shared
// attribution books a flat +1 per name (tap again unassigns + reverses +
// audit entry). Four players carry the shared strike-tracker (2 per team) and
// sit out at 2 strikes — display-only, the referee enforces. The photo loads
// fully visible (contain, never cropped) behind a skeleton while the external
// host answers, the title sits above it, and the room gets the photo through
// EITHER share button — link or image file — real native share, copy last-ish.
// Scoring is booked-effective like Top-10: per photo, `booked` tracks the net
// attributed amount actually in the score, so reversals always land exactly.

export {
  WHO_MAX_PHOTOS,
  WHO_STRIKES_OUT,
  nameKey,
  sharePayload,
  sharePhotoImage,
  sharePhotoUrl,
  type NameMap,
  type SharePath,
} from './whopicture-helpers';
import {
  countAssigned,
  nameKey,
  sharePhotoImage,
  sharePhotoUrl,
  WHO_MAX_PHOTOS,
  type NameMap,
  type ShareCapableNavigator,
} from './whopicture-helpers';
import {
  AssignedTeam,
  AttributionChange,
  AttributionComponent,
  AuditEntry,
  AuditStripComponent,
} from '../shared/attribution/attribution.component';
import {
  StrikeBump,
  StrikeRename,
  StrikeSlot,
  StrikeTrackerComponent,
  clampMistakes,
} from '../shared/strike-tracker/strike-tracker.component';

@Component({
  selector: 'app-whopicture',
  standalone: true,
  imports: [GameHeaderComponent, CountSelectorComponent,
    ScoreboardComponent,
    TimerComponent,
    ItemNavigationComponent,
    AttributionComponent,
    AuditStripComponent,
    StrikeTrackerComponent,
  ],
  templateUrl: './whopicture.component.html',
  styleUrl: './whopicture.component.scss',
})
export class WhopictureComponent {
  private settings = inject(SettingsService);
  readonly teamA = signal('');
  readonly teamB = signal('');
  readonly scoreA = signal(0);
  readonly scoreB = signal(0);
  readonly count = signal(1);
  readonly photos = signal<WhoPicturePhoto[]>([]);
  readonly idx = signal(0);
  readonly assignments = signal<Record<number, NameMap>>({});
  readonly booked = signal<Record<number, { A: number; B: number }>>({});
  readonly audit = signal<AuditEntry[]>([]);
  readonly strikes = signal<Record<number, StrikeSlot[]>>({});
  // Per-photo load state of the hotlinked image: skeleton → ready / failed.
  readonly imageState = signal<Record<number, 'loading' | 'ready' | 'failed'>>({});
  readonly msg = signal('');
  readonly maxPhotos = WHO_MAX_PHOTOS;
  private readonly booking = new ScoreBooking(this.scoreA, this.scoreB, this.audit);

  private readonly res = httpResource<WhoPicturePhoto[]>(
    () => `${API_BASE}/whopicture?count=${this.count()}`,
  );
  readonly loading = this.res.isLoading;

  constructor() {
    effect(() => {
      const rows = this.res.value();
      if (rows) {
        this.reconcile(rows);
        this.msg.set(rows.length ? '' : 'لا توجد صور بعد — أضف من صفحة إدارة الأسئلة.');
      }
      if (this.res.error()) this.msg.set('تعذر التحميل — تأكد أن السيرفر يعمل.');
    });
  }

  current(): WhoPicturePhoto | undefined {
    const ps = this.photos();
    return ps.length ? ps[Math.min(this.idx(), ps.length - 1)] : undefined;
  }

  assigned(photoId: number, i: number): AssignedTeam {
    return this.assignments()[photoId]?.[nameKey(i)] ?? null;
  }

  /** Hotlinked image lifecycle per photo: starts on 'loading' at first sight. */
  imageOf(photoId: number): 'loading' | 'ready' | 'failed' {
    return this.imageState()[photoId] ?? 'loading';
  }

  markLoaded(photoId: number): void {
    this.imageState.update((st) => (st[photoId] === 'ready' ? st : { ...st, [photoId]: 'ready' }));
  }

  /** The external host failed us (dead hotlink, offline image): an explicit
   * 'failed' replaces the eternal skeleton; showing-once wins over the error. */
  markFailed(photoId: number): void {
    this.imageState.update((st) => (st[photoId] === 'ready' ? st : { ...st, [photoId]: 'failed' }));
  }


  prev(): void {
    this.idx.update((i) => Math.max(0, i - 1));
  }

  next(): void {
    this.idx.update((i) => Math.min(Math.max(0, this.photos().length - 1), i + 1));
  }

  go(i: number): void {
    this.idx.set(i);
  }

  reload(): void {
    this.strikes.set({});
    this.imageState.set({});
    this.res.reload();
  }

  /** Attribution tap on one name: toggle the team, steer the booked amount
   * toward the target contribution (+1 per assigned name). */
  onName(photo: WhoPicturePhoto, i: number, ch: AttributionChange): void {
    const all = { ...this.assignments() };
    const prevMap = all[photo.id] ?? {};
    const from = prevMap[nameKey(i)] ?? null;
    const to: AssignedTeam = from === ch.picked ? null : ch.picked;
    const nextMap: NameMap = { ...prevMap };
    if (to) nextMap[nameKey(i)] = to;
    else delete nextMap[nameKey(i)];
    all[photo.id] = nextMap;
    this.assignments.set(all);
    const b = this.booked()[photo.id] ?? { A: 0, B: 0 };
    const eA = this.booking.book('A', countAssigned(nextMap, 'A') - b.A, photo.players[i]);
    const eB = this.booking.book('B', countAssigned(nextMap, 'B') - b.B, photo.players[i]);
    this.booked.update((bb) => ({ ...bb, [photo.id]: { A: b.A + eA, B: b.B + eB } }));
  }

  /** Reverse one photo's booked points and drop its assignments + strikes. */
  private reversePhoto(photo: WhoPicturePhoto): void {
    const b = this.booked()[photo.id] ?? { A: 0, B: 0 };
    if (b.A !== 0) this.booking.book('A', -b.A, photo.players[0]);
    if (b.B !== 0) this.booking.book('B', -b.B, photo.players[0]);
    const all = { ...this.assignments() };
    delete all[photo.id];
    this.assignments.set(all);
    this.booked.update((bb) => {
      const next = { ...bb };
      delete next[photo.id];
      return next;
    });
    this.strikes.update((ss) => {
      if (!(photo.id in ss)) return ss;
      const next = { ...ss };
      delete next[photo.id];
      return next;
    });
  }

  /** Swap in a fresh run: reverse photos that vanished, keep surviving ones.
   * @internal — page-owned; pages' specs drive it directly. */
  reconcile(rows: WhoPicturePhoto[]): void {
    const ids = new Set(rows.map((p) => p.id));
    for (const old of this.photos()) {
      if (!ids.has(old.id)) this.reversePhoto(old);
    }
    this.photos.set(rows);
    for (const p of rows) this.slotsOf(p);
    this.idx.update((i) => Math.min(i, Math.max(0, rows.length - 1)));
  }


  // Per-photo mistake tracker (display only): 4 named slots, 2 per team.
  // Stored per photo id, cleared when the photo leaves the run. Defaults
  // prefill "<team> - <player>" from the persisted settings, staying editable.
  /** Strike slot label: the saved player name alone when there is one,
   * otherwise "<team> - لاعب n" so the four slots stay distinguishable. */
  private slotName(team: string, player: string | undefined, ordinal: string): string {
    const n = (player ?? '').trim();
    return n ? n : `${team} - لاعب ${ordinal}`;
  }

  private defaultSlotNames(a: string, b: string): string[] {
    const pa = this.settings.playersA();
    const pb = this.settings.playersB();
    return [
      this.slotName(a, pa[0], '١'),
      this.slotName(a, pa[1], '٢'),
      this.slotName(b, pb[0], '١'),
      this.slotName(b, pb[1], '٢'),
    ];
  }

  /** Pure read: a photo's stored slots, or the prefilled defaults while it is
   * still unmaterialized. Never writes — the template calls this while
   * rendering (NG0600), so lazily materializing here is not an option. */
  slotsOf(photo: WhoPicturePhoto): StrikeSlot[] {
    return this.strikes()[photo.id] ?? this.freshSlots();
  }

  private freshSlots(): StrikeSlot[] {
    const a = this.teamA() || 'الفريق الأول';
    const b = this.teamB() || 'الفريق الثاني';
    return this.defaultSlotNames(a, b).map((name) => ({ name, mistakes: 0 }));
  }

  setSlotName(photoId: number, i: number, name: string): void {
    this.strikes.update((ss) => {
      const cur = ss[photoId] ?? this.freshSlots();
      const next = cur.map((s, j) => (j === i ? { ...s, name } : s));
      return { ...ss, [photoId]: next };
    });
  }

  bumpSlot(photoId: number, i: number, d: number): void {
    this.strikes.update((ss) => {
      const cur = ss[photoId] ?? this.freshSlots();
      const next = cur.map((s, j) =>
        j === i ? { ...s, mistakes: clampMistakes(s.mistakes + d, 2) } : s,
      );
      return { ...ss, [photoId]: next };
    });
  }

  resetSlot(photoId: number, i: number): void {
    this.strikes.update((ss) => {
      const cur = ss[photoId] ?? this.freshSlots();
      const next = cur.map((s, j) => (j === i ? { ...s, mistakes: 0 } : s));
      return { ...ss, [photoId]: next };
    });
  }

  // Event forwarders for the shared strike tracker (state stays page-owned).
  onSlotBump(photoId: number, b: StrikeBump): void {
    this.bumpSlot(photoId, b.index, b.delta);
  }

  onSlotReset(photoId: number, i: number): void {
    this.resetSlot(photoId, i);
  }

  onSlotRename(photoId: number, r: StrikeRename): void {
    this.setSlotName(photoId, r.index, r.name);
  }

  /** Shares the open photo's link with the room: real native sheet first,
   * the clipboard only when the browser has no share API. */
  async shareUrl(): Promise<void> {
    const p = this.current();
    if (!p) return;
    const path = await sharePhotoUrl(p.photoUrl, p.title, navigator as ShareCapableNavigator);
    if (path === 'copied') this.msg.set('تم نسخ رابط الصورة — شاركه مع الصالة.');
    else if (path === 'failed') this.msg.set('تعذّرت المشاركة — انسخ الرابط من شريط العنوان.');
  }

  /** Shares the image itself when the device can carry files; a refusal or a
   * failed fetch falls back to copying the link (last resort, never silent). */
  async shareImage(): Promise<void> {
    const p = this.current();
    if (!p) return;
    const path = await sharePhotoImage(p.photoUrl, p.title, navigator as ShareCapableNavigator);
    if (path === 'copied') this.msg.set('مشاركة الصورة غير مدعومة — تم نسخ الرابط بدلًا منها.');
    else if (path === 'failed') this.msg.set('تعذّر إرسال الصورة — افتح الرابط وشاركه يدويًا.');
  }
}
