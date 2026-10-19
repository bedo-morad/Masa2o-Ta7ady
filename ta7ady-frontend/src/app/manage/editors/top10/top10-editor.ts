import { signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../../../services/api.service';
import { ManageEditorHost } from '../shared/editor-host';

export const TOP10_EDITOR_SIZE = 13;
export type Top10Draft = { id?: number; prompt: string; answers: string[] };

const emptyAnswers = () => Array(TOP10_EDITOR_SIZE).fill('');

export class Top10Editor {
  readonly prompt = signal('');
  readonly answers = signal<string[]>(emptyAnswers());
  readonly editPrompt = signal('');
  readonly editAnswers = signal<string[]>(emptyAnswers());

  constructor(
    private readonly api: ApiService,
    private readonly host: ManageEditorHost,
  ) {}

  setAnswer(index: number, value: string): void {
    this.answers.update((items) => items.map((item, i) => (i === index ? value : item)));
  }
  setEditAnswer(index: number, value: string): void {
    this.editAnswers.update((items) => items.map((item, i) => (i === index ? value : item)));
  }
  startEdit(row: Top10Draft): void {
    this.editPrompt.set(row.prompt);
    this.editAnswers.set([...row.answers]);
    this.host.requestEdit(row.id!);
  }
  hostCancel(): void {
    this.host.cancelEdit();
  }

  async add(): Promise<void> {
    this.host.clearFeedback();
    const prompt = this.prompt();
    const answers = this.answers().map((answer) => answer.trim());
    if (answers.some((answer) => !answer)) {
      this.host.reportFeedback('أكمل العنوان والإجابات الـ13 كلها قبل الإضافة.', 'error');
      return;
    }
    try {
      await firstValueFrom(this.api.addTop10(prompt, answers));
      this.prompt.set('');
      this.answers.set(emptyAnswers());
      this.host.refreshAfterAdd();
      this.host.reportFeedback('تمت إضافة قائمة توب 10.', 'success');
    } catch (error: unknown) {
      this.host.reportMutationFailure(error, 'خطأ — يلزم عنوان و13 إجابة مميزة.');
    }
  }
  async save(id: number): Promise<void> {
    this.host.clearFeedback();
    const prompt = this.editPrompt().trim();
    const answers = this.editAnswers().map((answer) => answer.trim());
    if (!prompt || answers.some((answer) => !answer)) {
      this.host.reportFeedback('أكمل العنوان والإجابات الـ13 كلها قبل الحفظ.', 'error');
      return;
    }
    try {
      await firstValueFrom(this.api.update('top10', id, { prompt: this.editPrompt(), answers }));
      this.host.completeEdit('تم حفظ تعديل القائمة.');
    } catch (error: unknown) {
      this.host.reportEditFailure(error, 'خطأ — يلزم عنوان و13 إجابة مميزة.');
    }
  }
}
