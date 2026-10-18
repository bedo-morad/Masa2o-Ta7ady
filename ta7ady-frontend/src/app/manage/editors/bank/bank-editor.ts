import { firstValueFrom } from 'rxjs';
import { ApiService } from '../../../api.service';
import { ManageEditorHost } from '../shared/editor-host';
import { SharedBasicDrafts } from '../shared/basic-drafts';
import { applyEditMutation } from '../shared/edit-commit';

export class BankEditor {
  cancel(): void {
    this.host.cancelEdit();
  }
  constructor(
    private readonly api: ApiService,
    private readonly host: ManageEditorHost,
    readonly drafts: SharedBasicDrafts,
  ) {}
  async add(): Promise<void> {
    this.host.clearFeedback();
    try {
      await firstValueFrom(this.api.addBank(this.drafts.addQuestion(), this.drafts.addAnswer()));
      this.drafts.addQuestion.set('');
      this.drafts.addAnswer.set('');
      this.host.refreshAfterAdd();
      this.host.reportFeedback('تمت إضافة سؤال البنك.', 'success');
    } catch (e: unknown) {
      this.host.reportMutationFailure(e, 'خطأ — تأكد من طول السؤال والجواب.');
    }
  }
  start(row: { id: number; question: string; answer: string }): void {
    this.drafts.editQuestion.set(row.question);
    this.drafts.editAnswer.set(row.answer);
    this.host.requestEdit(row.id);
  }
  save(id: number): Promise<void> {
    return applyEditMutation(
      this.api,
      this.host,
      'bank',
      id,
      { question: this.drafts.editQuestion(), answer: this.drafts.editAnswer() },
      'تم حفظ تعديل السؤال.',
      'خطأ — تأكد من طول السؤال والجواب.',
    );
  }
}