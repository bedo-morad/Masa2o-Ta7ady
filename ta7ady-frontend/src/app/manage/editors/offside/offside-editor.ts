import { firstValueFrom } from 'rxjs';
import { ApiService } from '../../../services/api.service';
import { ManageEditorHost } from '../shared/editor-host';
import { SharedBasicDrafts } from '../shared/basic-drafts';
import { applyEditMutation } from '../shared/edit-commit';

export class OffsideEditor {
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
      await firstValueFrom(this.api.addOffside(this.drafts.addRule()));
      this.drafts.addRule.set('');
      this.host.refreshAfterAdd();
      this.host.reportFeedback('تمت إضافة القاعدة.', 'success');
    } catch (e: unknown) {
      this.host.reportMutationFailure(e, 'خطأ — القاعدة قصيرة.');
    }
  }
  start(row: { id: number; ruleText: string }): void {
    this.drafts.editText.set(row.ruleText);
    this.host.requestEdit(row.id);
  }
  save(id: number): Promise<void> {
    return applyEditMutation(
      this.api,
      this.host,
      'offside',
      id,
      { ruleText: this.drafts.editText() },
      'تم حفظ تعديل القاعدة.',
      'خطأ — القاعدة قصيرة.',
    );
  }
}