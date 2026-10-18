import { signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiService, WhoPicturePhoto } from '../api.service';
import { ManageEditorHost } from './manage-catalog';

export const WHO_PICTURE_EDITOR_SIZE = 11;
const empty = () => Array(WHO_PICTURE_EDITOR_SIZE).fill('');
export class WhoPictureEditor {
  readonly newPhotoTitle = signal('');
  readonly newPhotoUrl = signal('');
  readonly newPhotoPlayers = signal<string[]>(empty());
  readonly editPhotoTitle = signal('');
  readonly editPhotoUrl = signal('');
  readonly editPhotoPlayers = signal<string[]>(empty());
  constructor(
    private readonly api: ApiService,
    private readonly host: ManageEditorHost,
  ) {}
  setNewPlayer(i: number, v: string): void {
    this.newPhotoPlayers.update((a) => a.map((x, j) => (j === i ? v : x)));
  }
  setEditPlayer(i: number, v: string): void {
    this.editPhotoPlayers.update((a) => a.map((x, j) => (j === i ? v : x)));
  }
  startEdit(row: WhoPicturePhoto): void {
    this.editPhotoTitle.set(row.title);
    this.editPhotoUrl.set(row.photoUrl);
    this.editPhotoPlayers.set([...row.players]);
    this.host.requestEdit(row.id);
  }
  cancel(): void {
    this.host.cancelEdit();
  }
  async add(): Promise<void> {
    this.host.clearFeedback();
    const title = this.newPhotoTitle().trim(),
      url = this.newPhotoUrl().trim(),
      players = this.newPhotoPlayers().map((x) => x.trim());
    if (!title || !url || players.some((x) => !x)) {
      this.host.reportFeedback(
        'أكمل العنوان ورابط الصورة وأسماء اللاعبين الـ11 قبل الإضافة.',
        'error',
      );
      return;
    }
    try {
      const saved = await firstValueFrom(this.api.addWhopicture(title, url, players));
      this.resetAdd();
      this.host.refreshAfterAdd();
      this.host.reportFeedback(`تمت إضافة الصورة (#${saved.id}).`, 'success');
    } catch (e: unknown) {
      this.host.reportMutationFailure(e, 'خطأ — يلزم رابط صالح و11 اسمًا مميزًا.');
    }
  }
  async save(id: number): Promise<void> {
    this.host.clearFeedback();
    const title = this.editPhotoTitle().trim(),
      url = this.editPhotoUrl().trim(),
      players = this.editPhotoPlayers().map((x) => x.trim());
    if (!title || !url || players.some((x) => !x)) {
      this.host.reportFeedback(
        'أكمل العنوان ورابط الصورة وأسماء اللاعبين الـ11 قبل الحفظ.',
        'error',
      );
      return;
    }
    try {
      await firstValueFrom(this.api.update('whopicture', id, { title, photoUrl: url, players }));
      this.host.completeEdit(`تم حفظ تعديل الصورة (#${id}).`);
    } catch (e: unknown) {
      this.host.reportEditFailure(e, 'خطأ — يلزم عنوان ورابط صالح و11 اسمًا مميزًا.');
    }
  }
  private resetAdd(): void {
    this.newPhotoTitle.set('');
    this.newPhotoUrl.set('');
    this.newPhotoPlayers.set(empty());
  }
}
