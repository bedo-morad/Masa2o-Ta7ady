import { signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AnameenSubject, ApiService } from '../api.service';
import { ManageEditorHost } from './manage-catalog';

export const ANAMEEN_EDITOR_CLUES = 5;
const emptyClues = () => Array(ANAMEEN_EDITOR_CLUES).fill('');

export class AnameenEditor {
  readonly subject = signal('');
  readonly clues = signal<string[]>(emptyClues());
  readonly editSubject = signal('');
  readonly editClues = signal<string[]>(emptyClues());

  constructor(private readonly api: ApiService, private readonly host: ManageEditorHost) {}

  setClue(index: number, value: string): void {
    this.clues.update((items) => items.map((item, i) => (i === index ? value : item)));
  }
  setEditClue(index: number, value: string): void {
    this.editClues.update((items) => items.map((item, i) => (i === index ? value : item)));
  }
  startEdit(row: AnameenSubject): void {
    this.editSubject.set(row.player);
    this.editClues.set([...row.clues]);
    this.host.requestEdit(row.id);
  }
  hostCancel(): void { this.host.cancelEdit(); }

  async add(): Promise<void> {
    const player = this.subject().trim();
    const clues = this.clues().map((clue) => clue.trim());
    if (!player || clues.some((clue) => !clue)) {
      this.host.reportFeedback('أكمل اسم الشخصية والتلميحات الخمس قبل الإضافة.', 'error');
      return;
    }
    try {
      const saved = await firstValueFrom(this.api.addAnameen(player, clues));
      this.subject.set('');
      this.clues.set(emptyClues());
      this.host.refreshAfterAdd();
      this.host.reportFeedback(`تمت إضافة الشخصية (#${saved.id}).`, 'success');
    } catch (error: unknown) {
      this.host.reportMutationFailure(error, 'خطأ — يلزم اسم وخمسة تلميحات مميزة.');
    }
  }
  async save(id: number): Promise<void> {
    const player = this.editSubject().trim();
    const clues = this.editClues().map((clue) => clue.trim());
    if (!player || clues.some((clue) => !clue)) {
      this.host.reportFeedback('أكمل اسم الشخصية والتلميحات الخمس قبل الحفظ.', 'error');
      return;
    }
    try {
      await firstValueFrom(this.api.update('anameen', id, { player, clues }));
      this.host.completeEdit(`تم حفظ تعديل الشخصية (#${id}).`);
    } catch (error: unknown) {
      this.host.reportMutationFailure(error, 'خطأ — يلزم اسم وخمسة تلميحات مميزة.');
    }
  }
}
