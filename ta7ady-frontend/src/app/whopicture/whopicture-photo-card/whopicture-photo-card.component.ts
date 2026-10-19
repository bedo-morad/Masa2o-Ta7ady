import { Component, computed, input, linkedSignal, output } from '@angular/core';
import { WhoPicturePhoto } from '../../services/api.service';
import { sharePhotoImage, sharePhotoUrl, type ShareCapableNavigator } from '../whopicture-helpers';

export type PhotoImageState = 'loading' | 'ready' | 'failed';

@Component({
  selector: 'app-whopicture-photo-card',
  standalone: true,
  templateUrl: './whopicture-photo-card.component.html',
  styleUrl: './whopicture-photo-card.component.scss',
})
export class WhopicturePhotoCardComponent {
  readonly photo = input.required<WhoPicturePhoto>();
  readonly resetToken = input(0);
  readonly shareNotice = output<string>();

  // Navigation preserves each photo's state; only an explicit redraw clears it.
  private readonly imageStates = linkedSignal<Record<number, PhotoImageState>>(() => {
    this.resetToken();
    return {};
  });
  readonly imageState = computed(() => this.imageStates()[this.photo().id] ?? 'loading');

  markLoaded(): void {
    const id = this.photo().id;
    this.imageStates.update((states) =>
      states[id] === 'ready' ? states : { ...states, [id]: 'ready' },
    );
  }

  // Once a photo has been shown, a later error must not hide it.
  markFailed(): void {
    const id = this.photo().id;
    this.imageStates.update((states) =>
      states[id] === 'ready' ? states : { ...states, [id]: 'failed' },
    );
  }

  async shareUrl(): Promise<void> {
    const photo = this.photo();
    const path = await sharePhotoUrl(
      photo.photoUrl,
      photo.title,
      navigator as ShareCapableNavigator,
    );
    if (path === 'copied') this.shareNotice.emit('تم نسخ رابط الصورة — شاركه مع الصالة.');
    else if (path === 'failed') {
      this.shareNotice.emit('تعذّرت المشاركة — انسخ الرابط من شريط العنوان.');
    }
  }

  async shareImage(): Promise<void> {
    const photo = this.photo();
    const path = await sharePhotoImage(
      photo.photoUrl,
      photo.title,
      navigator as ShareCapableNavigator,
    );
    if (path === 'copied') {
      this.shareNotice.emit('مشاركة الصورة غير مدعومة — تم نسخ الرابط بدلًا منها.');
    } else if (path === 'failed') {
      this.shareNotice.emit('تعذّر إرسال الصورة — افتح الرابط وشاركه يدويًا.');
    }
  }
}
