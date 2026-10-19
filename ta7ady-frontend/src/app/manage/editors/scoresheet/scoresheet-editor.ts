import { signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../../../services/api.service';
import { ManageEditorHost } from '../shared/editor-host';

export const SCORESHEET_EDITOR_SIZE = 11;
export type ScoreSheetRow = {
  id: number;
  matchLabel: string;
  teamA: string;
  teamB: string;
  lineupA: string[];
  lineupB: string[];
};
const empty = () => Array(SCORESHEET_EDITOR_SIZE).fill('');

export class ScoreSheetEditor {
  readonly newMatch = signal('');
  readonly newTeamA = signal('');
  readonly newTeamB = signal('');
  readonly lineupA = signal<string[]>(empty());
  readonly lineupB = signal<string[]>(empty());
  readonly editMatch = signal('');
  readonly editTeamA = signal('');
  readonly editTeamB = signal('');
  readonly editLineupA = signal<string[]>(empty());
  readonly editLineupB = signal<string[]>(empty());
  constructor(
    private readonly api: ApiService,
    private readonly host: ManageEditorHost,
  ) {}
  setLineupA(i: number, v: string): void {
    this.lineupA.update((a) => a.map((x, j) => (j === i ? v : x)));
  }
  setLineupB(i: number, v: string): void {
    this.lineupB.update((a) => a.map((x, j) => (j === i ? v : x)));
  }
  setEditLineupA(i: number, v: string): void {
    this.editLineupA.update((a) => a.map((x, j) => (j === i ? v : x)));
  }
  setEditLineupB(i: number, v: string): void {
    this.editLineupB.update((a) => a.map((x, j) => (j === i ? v : x)));
  }
  startEdit(row: ScoreSheetRow): void {
    this.editMatch.set(row.matchLabel);
    this.editTeamA.set(row.teamA);
    this.editTeamB.set(row.teamB);
    this.editLineupA.set([...row.lineupA]);
    this.editLineupB.set([...row.lineupB]);
    this.host.requestEdit(row.id);
  }
  cancel(): void {
    this.host.cancelEdit();
  }
  async add(): Promise<void> {
    this.host.clearFeedback();
    const a = this.lineupA().map((x) => x.trim()),
      b = this.lineupB().map((x) => x.trim());
    if (
      !this.newMatch().trim() ||
      !this.newTeamA().trim() ||
      !this.newTeamB().trim() ||
      a.some((x) => !x) ||
      b.some((x) => !x)
    ) {
      this.host.reportFeedback('أكمل اسم المباراة والفريقين و22 لاعبًا قبل الإضافة.', 'error');
      return;
    }
    try {
      await firstValueFrom(
        this.api.addScoresheet(this.newMatch(), this.newTeamA(), this.newTeamB(), a, b),
      );
      this.resetAdd();
      this.host.refreshAfterAdd();
      this.host.reportFeedback('تمت إضافة المباراة.', 'success');
    } catch (e: unknown) {
      this.host.reportMutationFailure(e, 'خطأ — يلزم اسم مباراة وفريقان و11 لاعبًا لكل تشكيلة.');
    }
  }
  async save(id: number): Promise<void> {
    this.host.clearFeedback();
    const a = this.editLineupA().map((x) => x.trim()),
      b = this.editLineupB().map((x) => x.trim());
    if (
      !this.editMatch().trim() ||
      !this.editTeamA().trim() ||
      !this.editTeamB().trim() ||
      a.some((x) => !x) ||
      b.some((x) => !x)
    ) {
      this.host.reportFeedback('أكمل اسم المباراة والفريقين و22 لاعبًا قبل الحفظ.', 'error');
      return;
    }
    try {
      await firstValueFrom(
        this.api.update('scoresheet', id, {
          match: this.editMatch(),
          teamA: this.editTeamA(),
          teamB: this.editTeamB(),
          lineupA: a,
          lineupB: b,
        }),
      );
      this.host.completeEdit('تم حفظ تعديل المباراة.');
    } catch (e: unknown) {
      this.host.reportEditFailure(e, 'خطأ — يلزم اسم مباراة وفريقان و11 لاعبًا لكل تشكيلة.');
    }
  }
  private resetAdd(): void {
    this.newMatch.set('');
    this.newTeamA.set('');
    this.newTeamB.set('');
    this.lineupA.set(empty());
    this.lineupB.set(empty());
  }
}
