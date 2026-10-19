import { firstValueFrom } from 'rxjs';
import { ApiService } from '../../../services/api.service';
import { ManageEditorHost } from '../shared/editor-host';
import { SharedBasicDrafts } from '../shared/basic-drafts';
import { applyEditMutation } from '../shared/edit-commit';

export class IhbidEditor {
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
      await firstValueFrom(this.api.addIhbid(this.drafts.addQuestion(), this.drafts.addAnswer()));
      this.drafts.addQuestion.set('');
      this.drafts.addAnswer.set('');
      this.host.refreshAfterAdd();
      this.host.reportFeedback('تمت إضافة السؤال.', 'success');
    } catch (e: unknown) {
      this.host.reportMutationFailure(e, 'خطأ — تأكد من طول السؤال والجواب.');
    }
  }
  start(row: { id: number; questionText: string; answerText: string }): void {
    this.drafts.editQuestion.set(row.questionText);
    this.drafts.editAnswer.set(row.answerText);
    this.host.requestEdit(row.id);
  }
  save(id: number): Promise<void> {
    return applyEditMutation(
      this.api,
      this.host,
      'ihbid',
      id,
      { questionText: this.drafts.editQuestion(), answerText: this.drafts.editAnswer() },
      'تم حفظ تعديل السؤال.',
      'خطأ — تأكد من طول السؤال والجواب.',
    );
  }
}