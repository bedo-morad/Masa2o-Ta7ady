import { signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiService, RiskPack, RiskQuestion } from '../../../services/api.service';
import { ManageEditorHost } from '../shared/editor-host';

export const RISK_TIERS = [5, 10, 20, 40] as const;

function blankRisk(): RiskQuestion[] {
  return RISK_TIERS.map((points) => ({ points, question: '', answer: '' }));
}

export class RiskPackEditorModel {
  readonly riskTiers = RISK_TIERS;
  readonly newGenre = signal('');
  readonly newRisk = signal(blankRisk());
  readonly editGenre = signal('');
  readonly editRisk = signal(blankRisk());

  constructor(
    private readonly api: ApiService,
    private readonly host: ManageEditorHost,
  ) {}

  setNewRisk(index: number, field: 'question' | 'answer', value: string): void {
    this.newRisk.update((questions) =>
      questions.map((question, i) => (i === index ? { ...question, [field]: value } : question)),
    );
  }

  setEditRisk(index: number, field: 'question' | 'answer', value: string): void {
    this.editRisk.update((questions) =>
      questions.map((question, i) => (i === index ? { ...question, [field]: value } : question)),
    );
  }

  startEdit(pack: RiskPack): void {
    this.editGenre.set(pack.genre);
    this.editRisk.set(
      pack.questions.map((question, i) => ({
        ...question,
        points: RISK_TIERS[i],
      })),
    );
    this.host.requestEdit(pack.id);
  }

  cancelEdit(): void {
    this.host.cancelEdit();
  }

  async add(): Promise<void> {
    this.host.clearFeedback();
    const genre = this.newGenre().trim();
    const questions = this.normalize(this.newRisk());
    if (!this.valid(genre, questions)) {
      this.host.reportFeedback('أكمل النوع والأسئلة الأربعة (سؤال وجواب) قبل الإضافة.', 'error');
      return;
    }
    try {
      await firstValueFrom(this.api.addRisk(genre, questions));
      this.newGenre.set('');
      this.newRisk.set(blankRisk());
      this.host.refreshAfterAdd();
      this.host.reportFeedback('تمت إضافة حزمة الريسك.', 'success');
    } catch (error: unknown) {
      this.host.reportFeedback(
        this.apiMessage(error) ?? 'خطأ — يلزم نوع وأربعة أسئلة بفئات 5/10/20/40.',
        'error',
      );
    }
  }

  async save(id: number): Promise<void> {
    this.host.clearFeedback();
    const genre = this.editGenre().trim();
    const questions = this.normalize(this.editRisk());
    if (!this.valid(genre, questions)) {
      this.host.reportFeedback('أكمل النوع والأسئلة الأربعة (سؤال وجواب) قبل الحفظ.', 'error');
      return;
    }
    try {
      await firstValueFrom(this.api.update('risk', id, { genre, questions }));
    } catch (error: unknown) {
      this.host.reportEditFailure(error, 'خطأ — يلزم نوع وأربعة أسئلة بفئاتها.');
      return;
    }
    this.host.completeEdit('تم حفظ تعديل الحزمة.');
  }

  private normalize(questions: RiskQuestion[]): RiskQuestion[] {
    return questions.map((question, i) => ({
      points: RISK_TIERS[i],
      question: question.question.trim(),
      answer: question.answer.trim(),
    }));
  }

  private valid(genre: string, questions: RiskQuestion[]): boolean {
    return (
      Boolean(genre) &&
      questions.length === RISK_TIERS.length &&
      questions.every((question) => Boolean(question.question) && Boolean(question.answer))
    );
  }

  private apiMessage(error: unknown): string | null {
    if (typeof error !== 'object' || error === null || !('error' in error)) return null;
    const body = (error as { error?: { message?: unknown } }).error;
    return body && typeof body.message === 'string' && body.message ? body.message : null;
  }
}
