import { firstValueFrom } from 'rxjs';
import { ApiService } from '../../../services/api.service';
import { ManageEditorHost } from '../shared/editor-host';
import { SharedBasicDrafts } from '../shared/basic-drafts';
import { applyEditMutation } from '../shared/edit-commit';

export class PlayersEditor {
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
      await firstValueFrom(this.api.addPlayer(this.drafts.addPlayer()));
      this.drafts.addPlayer.set('');
      this.host.refreshAfterAdd();
      this.host.reportFeedback('تمت الإضافة إلى أسماء اللاعبين.', 'success');
    } catch (e: unknown) {
      this.host.reportMutationFailure(e, 'خطأ — الاسم قصير أو مكرر.');
    }
  }
  start(row: { id: number; playerName: string }): void {
    this.drafts.editText.set(row.playerName);
    this.host.requestEdit(row.id);
  }
  save(id: number): Promise<void> {
    return applyEditMutation(
      this.api,
      this.host,
      'players',
      id,
      { playerName: this.drafts.editText() },
      'تم حفظ تعديل اسم اللاعب.',
      'خطأ — الاسم قصير أو مكرر.',
    );
  }
}