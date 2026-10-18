import { signal, WritableSignal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiService, Pool } from '../api.service';
import { ManageEditorHost } from './manage-catalog';

export interface SharedBasicDrafts {
  readonly addPlayer: WritableSignal<string>;
  readonly addRule: WritableSignal<string>;
  readonly addQuestion: WritableSignal<string>;
  readonly addAnswer: WritableSignal<string>;
  readonly editText: WritableSignal<string>;
  readonly editQuestion: WritableSignal<string>;
  readonly editAnswer: WritableSignal<string>;
}

export function makeSharedBasicDrafts(): SharedBasicDrafts {
  return {
    addPlayer: signal(''),
    addRule: signal(''),
    addQuestion: signal(''),
    addAnswer: signal(''),
    editText: signal(''),
    editQuestion: signal(''),
    editAnswer: signal(''),
  };
}

export async function applyEditMutation(
  api: ApiService,
  host: ManageEditorHost,
  pool: Pool,
  id: number,
  body: unknown,
  success: string,
  fallback: string,
): Promise<void> {
  host.clearFeedback();
  try {
    await firstValueFrom(api.update(pool, id, body));
  } catch (error: unknown) {
    host.reportEditFailure(error, fallback);
    return;
  }
  host.completeEdit(success);
}

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
