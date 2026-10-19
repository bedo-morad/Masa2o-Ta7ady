import { ComponentFixture, TestBed } from '@angular/core/testing';
import { WhopicturePhotoCardComponent } from './whopicture-photo-card.component';
import { WhoPicturePhoto } from '../../services/api.service';

describe('WhopicturePhotoCardComponent', () => {
  let fixture: ComponentFixture<WhopicturePhotoCardComponent>;
  const photo: WhoPicturePhoto = {
    id: 7,
    title: 'عنوان',
    photoUrl: 'https://x/p.jpg',
    players: [],
  };
  const view = (): HTMLElement => fixture.nativeElement;
  function imageEvent(type: 'load' | 'error'): void {
    view().querySelector('img')!.dispatchEvent(new Event(type));
    fixture.detectChanges();
  }
  function show(next: WhoPicturePhoto): void {
    fixture.componentRef.setInput('photo', next);
    fixture.detectChanges();
  }
  function shareButton(kind: 'image' | 'url'): HTMLButtonElement {
    const label = kind === 'image' ? 'مشاركة صورة الفريق نفسها' : 'مشاركة رابط الصورة';
    return view().querySelector(`[aria-label="${label}"]`)!;
  }
  function browserSharing(share: unknown = undefined, canShare: unknown = undefined) {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
    Object.defineProperty(navigator, 'share', { configurable: true, value: share });
    Object.defineProperty(navigator, 'canShare', { configurable: true, value: canShare });
    return writeText;
  }
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WhopicturePhotoCardComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(WhopicturePhotoCardComponent);
    fixture.componentRef.setInput('photo', photo);
    fixture.detectChanges();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    delete (navigator as unknown as { clipboard?: unknown }).clipboard;
    delete (navigator as unknown as { share?: unknown }).share;
    delete (navigator as unknown as { canShare?: unknown }).canShare;
  });

  it('renders the title and skeleton until the image loads', () => {
    expect(view().querySelector('.title')?.textContent).toBe('عنوان');
    expect(view().querySelector('.shot-skeleton')).not.toBeNull();
    imageEvent('load');
    expect(view().querySelector('img')?.classList.contains('is-ready')).toBe(true);
    expect(view().querySelector('.shot-skeleton')).toBeNull();
  });

  it('replaces the skeleton on error and recovers on a later load', () => {
    imageEvent('error');
    expect(view().querySelector('.shot-failed')?.textContent).toContain('تعذّر تحميل الصورة');
    expect(view().querySelector('.shot-skeleton')).toBeNull();
    imageEvent('load');
    expect(view().querySelector('.shot-failed')).toBeNull();
    expect(view().querySelector('img')?.classList.contains('is-ready')).toBe(true);
    imageEvent('error');
    expect(view().querySelector('.shot-failed')).toBeNull();
  });

  it('remembers ready and failed states by photo ID across A → B → A', () => {
    imageEvent('load');
    show({ ...photo, id: 8, photoUrl: 'https://x/b.jpg' });
    expect(view().querySelector('.shot-skeleton')).not.toBeNull();
    imageEvent('error');
    show({ ...photo });
    expect(view().querySelector('img')?.classList.contains('is-ready')).toBe(true);
    show({ ...photo, id: 8, photoUrl: 'https://x/b.jpg' });
    expect(view().querySelector('.shot-failed')).not.toBeNull();
  });

  it('resets all remembered states only when the reset token changes, including the same photo', () => {
    imageEvent('load');
    show({ ...photo, id: 8, photoUrl: 'https://x/b.jpg' });
    imageEvent('error');
    fixture.componentRef.setInput('resetToken', 1);
    fixture.detectChanges();
    expect(view().querySelector('.shot-skeleton')).not.toBeNull();
    show(photo);
    expect(view().querySelector('.shot-skeleton')).not.toBeNull();
    imageEvent('load');
    fixture.componentRef.setInput('resetToken', 1);
    fixture.detectChanges();
    expect(view().querySelector('img')?.classList.contains('is-ready')).toBe(true);
  });

  it('copies the current link and emits the existing localized notice', async () => {
    const writeText = browserSharing();
    const notice = vi.fn();
    fixture.componentInstance.shareNotice.subscribe(notice);
    shareButton('url').click();
    await fixture.whenStable();
    expect(writeText).toHaveBeenCalledWith(photo.photoUrl);
    expect(notice).toHaveBeenCalledWith('تم نسخ رابط الصورة — شاركه مع الصالة.');
  });

  it('uses the native link sheet without emitting a notice on success or cancellation', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    const copy = browserSharing(share);
    const notice = vi.fn();
    fixture.componentInstance.shareNotice.subscribe(notice);
    shareButton('url').click();
    await fixture.whenStable();
    expect(share).toHaveBeenCalledWith({ title: 'مين في الصورة؟ — عنوان', url: photo.photoUrl });
    share.mockRejectedValueOnce(new DOMException('cancelled', 'AbortError'));
    shareButton('url').click();
    await fixture.whenStable();
    expect(copy).not.toHaveBeenCalled();
    expect(notice).not.toHaveBeenCalled();
  });

  it('copies with the existing image notice when file sharing is refused', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    const copy = browserSharing(share, () => false);
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        blob: async () => new Blob(['image'], { type: 'image/jpeg' }),
      }),
    );
    const notice = vi.fn();
    fixture.componentInstance.shareNotice.subscribe(notice);
    shareButton('image').click();
    await fixture.whenStable();
    expect(copy).toHaveBeenCalledWith(photo.photoUrl);
    expect(share).not.toHaveBeenCalled();
    expect(notice).toHaveBeenCalledWith('مشاركة الصورة غير مدعومة — تم نسخ الرابط بدلًا منها.');
  });

  it('shares an image file natively without emitting a fallback notice', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    const copy = browserSharing(share, () => true);
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        blob: async () => new Blob(['image'], { type: 'image/jpeg' }),
      }),
    );
    const notice = vi.fn();
    fixture.componentInstance.shareNotice.subscribe(notice);
    shareButton('image').click();
    await fixture.whenStable();
    expect(share).toHaveBeenCalledWith({
      files: [expect.any(File)],
      title: 'مين في الصورة؟ — عنوان',
    });
    expect(copy).not.toHaveBeenCalled();
    expect(notice).not.toHaveBeenCalled();
  });

  it('emits the existing failure notices when neither sharing nor copying works', async () => {
    browserSharing().mockRejectedValue(new Error('denied'));
    const notice = vi.fn();
    fixture.componentInstance.shareNotice.subscribe(notice);
    shareButton('url').click();
    await fixture.whenStable();
    expect(notice).toHaveBeenLastCalledWith('تعذّرت المشاركة — انسخ الرابط من شريط العنوان.');
    shareButton('image').click();
    await fixture.whenStable();
    expect(notice).toHaveBeenLastCalledWith('تعذّر إرسال الصورة — افتح الرابط وشاركه يدويًا.');
  });
});
