import { ComponentFixture, TestBed } from '@angular/core/testing';
import { WhopicturePhotoCardComponent } from './whopicture-photo-card.component';
import { WhoPicturePhoto } from '../../api.service';

describe('WhopicturePhotoCardComponent', () => {
  let fixture: ComponentFixture<WhopicturePhotoCardComponent>;
  const photo: WhoPicturePhoto = {
    id: 7,
    title: 'عنوان',
    photoUrl: 'https://x/p.jpg',
    players: [],
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WhopicturePhotoCardComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(WhopicturePhotoCardComponent);
    fixture.componentRef.setInput('photo', photo);
    fixture.detectChanges();
  });

  it('renders title and loading stage, then emits image lifecycle events', () => {
    expect(fixture.nativeElement.querySelector('.title').textContent).toContain('عنوان');
    const loaded = vi.fn();
    const failed = vi.fn();
    fixture.componentInstance.imageLoaded.subscribe(loaded);
    fixture.componentInstance.imageFailed.subscribe(failed);
    const image = fixture.nativeElement.querySelector('img');
    image.dispatchEvent(new Event('load'));
    image.dispatchEvent(new Event('error'));
    expect(loaded).toHaveBeenCalledWith(7);
    expect(failed).toHaveBeenCalledWith(7);
  });

  it('emits both share actions from their visible buttons', () => {
    const imageShare = vi.fn();
    const urlShare = vi.fn();
    fixture.componentInstance.shareImage.subscribe(imageShare);
    fixture.componentInstance.shareUrl.subscribe(urlShare);
    fixture.nativeElement.querySelector('[aria-label="مشاركة صورة الفريق نفسها"]').click();
    fixture.nativeElement.querySelector('[aria-label="مشاركة رابط الصورة"]').click();
    expect(imageShare).toHaveBeenCalledOnce();
    expect(urlShare).toHaveBeenCalledOnce();
  });
});
