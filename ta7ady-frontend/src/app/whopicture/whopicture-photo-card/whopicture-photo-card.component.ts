import { Component, input, output } from '@angular/core';
import { WhoPicturePhoto } from '../../services/api.service';

export type PhotoImageState = 'loading' | 'ready' | 'failed';

@Component({
  selector: 'app-whopicture-photo-card',
  standalone: true,
  templateUrl: './whopicture-photo-card.component.html',
  styleUrl: './whopicture-photo-card.component.scss',
})
export class WhopicturePhotoCardComponent {
  readonly photo = input.required<WhoPicturePhoto>();
  readonly imageState = input<PhotoImageState>('loading');
  readonly imageLoaded = output<number>();
  readonly imageFailed = output<number>();
  readonly shareImage = output<void>();
  readonly shareUrl = output<void>();
}
