import { Component, computed, inject, signal, TemplateRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { httpResource } from '@angular/common/http';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { HotToastService } from '@ngxpert/hot-toast';
import { API_BASE, ApiService, Page, Pool } from '../api.service';
import { ImportPanelComponent } from './import/import-panel.component';

const SIZE = 20;
export const TOP10_SIZE = 13;
export const LINEUP_SIZE = 11;

@Component({
  selector: 'app-manage',
  standalone: true,
  imports: [FormsModule, RouterLink, ImportPanelComponent],
  templateUrl: './manage.component.html',
  styleUrl: './manage.component.scss',
})
export class ManageComponent {
  readonly api = inject(ApiService);
  private readonly modal = inject(NgbModal);
  private readonly toast = inject(HotToastService);

  readonly pool = signal<Pool>('players');
  readonly page = signal(0);
  readonly msg = signal('');

  readonly adminPw = signal('');
  readonly adminError = signal('');
  readonly adminOn = computed(() => this.api.adminPassword() !== null);

  readonly newPlayer = signal('');
  readonly newQuestion = signal('');
  readonly newAnswer = signal('');
  readonly newRule = signal('');
  readonly newTop10Prompt = signal('');
  readonly top10Answers = signal<string[]>(Array(TOP10_SIZE).fill(''));
  readonly newMatch = signal('');
  readonly newTeamA = signal('');
  readonly newTeamB = signal('');
  readonly lineupA = signal<string[]>(Array(LINEUP_SIZE).fill(''));
  readonly lineupB = signal<string[]>(Array(LINEUP_SIZE).fill(''));

  readonly top10Ranks = Array.from({ length: TOP10_SIZE }, (_, i) => i + 1);
  readonly lineupSlots = Array.from({ length: LINEUP_SIZE }, (_, i) => i + 1);

  // Accordion for managed top-10 / scoresheet rows: one open at a time.
  readonly expandedId = signal<number | null>(null);

  toggle(id: number): void {
    this.expandedId.update((open) => (open === id ? null : id));
  }

  isOpen(id: number): boolean {
    return this.expandedId() === id;
  }

  private readonly playersRes = httpResource<Page<{ id: number; playerName: string }>>(() =>
    this.pool() === 'players'
      ? `${API_BASE}/players/all?page=${this.page()}&size=${SIZE}&sort=id,desc`
      : undefined,
  );
  private readonly ihbidRes = httpResource<
    Page<{ id: number; questionText: string; answerText: string }>
  >(() =>
    this.pool() === 'ihbid'
      ? `${API_BASE}/ihbid/all?page=${this.page()}&size=${SIZE}&sort=id,desc`
      : undefined,
  );
  private readonly offsideRes = httpResource<Page<{ id: number; ruleText: string }>>(() =>
    this.pool() === 'offside'
      ? `${API_BASE}/offside/all?page=${this.page()}&size=${SIZE}&sort=id,desc`
      : undefined,
  );
  private readonly top10Res = httpResource<Page<{ id: number; prompt: string; answers: string[] }>>(
    () =>
      this.pool() === 'top10'
        ? `${API_BASE}/top10/all?page=${this.page()}&size=${SIZE}&sort=id,desc`
        : undefined,
  );
  private readonly scoresheetRes = httpResource<
    Page<{
      id: number;
      matchLabel: string;
      teamA: string;
      teamB: string;
      lineupA: string[];
      lineupB: string[];
    }>
  >(() =>
    this.pool() === 'scoresheet'
      ? `${API_BASE}/scoresheet/all?page=${this.page()}&size=${SIZE}&sort=id,desc`
      : undefined,
  );

  readonly playerRows = computed(() => this.playersRes.value()?.content ?? []);
  readonly ihbidRows = computed(() => this.ihbidRes.value()?.content ?? []);
  readonly offsideRows = computed(() => this.offsideRes.value()?.content ?? []);
  readonly top10Rows = computed(() => this.top10Res.value()?.content ?? []);
  readonly scoresheetRows = computed(() => this.scoresheetRes.value()?.content ?? []);

  readonly totalElements = computed(() => this.activePage()?.totalElements ?? 0);
  readonly totalPages = computed(() => this.activePage()?.totalPages ?? 0);
  readonly loading = computed(
    () =>
      this.playersRes.isLoading() ||
      this.ihbidRes.isLoading() ||
      this.offsideRes.isLoading() ||
      this.top10Res.isLoading() ||
      this.scoresheetRes.isLoading(),
  );

  private activePage() {
    if (this.pool() === 'players') return this.playersRes.value();
    if (this.pool() === 'ihbid') return this.ihbidRes.value();
    if (this.pool() === 'top10') return this.top10Res.value();
    if (this.pool() === 'scoresheet') return this.scoresheetRes.value();
    return this.offsideRes.value();
  }

  select(p: Pool): void {
    this.pool.set(p);
    this.page.set(0);
    this.msg.set('');
    this.expandedId.set(null);
  }

  prev(): void {
    if (this.page() > 0) this.page.update((p) => p - 1);
    this.expandedId.set(null);
  }

  next(): void {
    if (this.page() + 1 < this.totalPages()) this.page.update((p) => p + 1);
    this.expandedId.set(null);
  }

  openAdminModal(content: TemplateRef<unknown>): void {
    this.adminError.set('');
    this.modal.open(content, { centered: true });
  }

  unlockAdmin(dismiss?: { dismiss: () => void }): void {
    const pw = this.adminPw().trim();
    if (!pw) {
      this.adminError.set('أدخل كلمة المرور.');
      return;
    }
    this.api.unlock(pw);
    this.adminPw.set('');
    this.adminError.set('');
    this.msg.set('تم تفعيل وضع الإدارة لهذه الجلسة — ظهرت أزرار الحذف.');
    dismiss?.dismiss();
  }

  lockAdmin(dismiss?: { dismiss: () => void }): void {
    this.api.lock();
    this.adminError.set('');
    this.msg.set('تم قفل وضع الإدارة — أُخفيت أزرار الحذف.');
    dismiss?.dismiss();
  }

  onImported(): void {
    this.reloadActive();
    this.msg.set('تم الاستيراد — القائمة محدثة.');
  }

  setTop10Answer(i: number, v: string): void {
    this.top10Answers.update((arr) => arr.map((old, j) => (j === i ? v : old)));
  }

  setLineupA(i: number, v: string): void {
    this.lineupA.update((arr) => arr.map((old, j) => (j === i ? v : old)));
  }

  setLineupB(i: number, v: string): void {
    this.lineupB.update((arr) => arr.map((old, j) => (j === i ? v : old)));
  }

  private reloadActive(): void {
    if (this.pool() === 'players') this.playersRes.reload();
    else if (this.pool() === 'ihbid') this.ihbidRes.reload();
    else if (this.pool() === 'top10') this.top10Res.reload();
    else if (this.pool() === 'scoresheet') this.scoresheetRes.reload();
    else this.offsideRes.reload();
  }

  async addPlayer(): Promise<void> {
    this.msg.set('');
    try {
      await firstValueFrom(this.api.addPlayer(this.newPlayer()));
      this.newPlayer.set('');
      if (this.page() === 0) this.reloadActive();
      else this.page.set(0);
      this.msg.set('تمت الإضافة إلى أسماء اللاعبين.');
      this.toast.success('تمت الإضافة إلى أسماء اللاعبين.');
    } catch (e: unknown) {
      const reason = this.apiMsg(e) ?? 'خطأ — الاسم قصير أو مكرر.';
      this.msg.set(reason);
      this.toast.error(reason);
    }
  }

  async addIhbid(): Promise<void> {
    this.msg.set('');
    try {
      await firstValueFrom(this.api.addIhbid(this.newQuestion(), this.newAnswer()));
      this.newQuestion.set('');
      this.newAnswer.set('');
      if (this.page() === 0) this.reloadActive();
      else this.page.set(0);
      this.msg.set('تمت إضافة السؤال.');
      this.toast.success('تمت إضافة السؤال.');
    } catch (e: unknown) {
      const reason = this.apiMsg(e) ?? 'خطأ — تأكد من طول السؤال والجواب.';
      this.msg.set(reason);
      this.toast.error(reason);
    }
  }

  async addOffside(): Promise<void> {
    this.msg.set('');
    try {
      await firstValueFrom(this.api.addOffside(this.newRule()));
      this.newRule.set('');
      if (this.page() === 0) this.reloadActive();
      else this.page.set(0);
      this.msg.set('تمت إضافة القاعدة.');
      this.toast.success('تمت إضافة القاعدة.');
    } catch (e: unknown) {
      const reason = this.apiMsg(e) ?? 'خطأ — القاعدة قصيرة.';
      this.msg.set(reason);
      this.toast.error(reason);
    }
  }

  async addTop10(): Promise<void> {
    this.msg.set('');
    const answers = this.top10Answers().map((a) => a.trim());
    if (answers.some((a) => !a)) {
      const reason = 'أكمل الإجابات الـ13 كلها قبل الإضافة.';
      this.msg.set(reason);
      this.toast.error(reason);
      return;
    }
    try {
      await firstValueFrom(this.api.addTop10(this.newTop10Prompt(), answers));
      this.newTop10Prompt.set('');
      this.top10Answers.set(Array(TOP10_SIZE).fill(''));
      if (this.page() === 0) this.reloadActive();
      else this.page.set(0);
      this.msg.set('تمت إضافة قائمة التوب 10.');
      this.toast.success('تمت إضافة قائمة التوب 10.');
    } catch (e: unknown) {
      const reason = this.apiMsg(e) ?? 'خطأ — يلزم عنوان و13 إجابة مميزة.';
      this.msg.set(reason);
      this.toast.error(reason);
    }
  }

  async addScoresheet(): Promise<void> {
    this.msg.set('');
    const a = this.lineupA().map((p) => p.trim());
    const b = this.lineupB().map((p) => p.trim());
    if (!this.newMatch().trim() || !this.newTeamA().trim() || !this.newTeamB().trim()
      || a.some((p) => !p) || b.some((p) => !p)) {
      const reason = 'أكمل اسم المباراة والفريقين و22 لاعبًا قبل الإضافة.';
      this.msg.set(reason);
      this.toast.error(reason);
      return;
    }
    try {
      await firstValueFrom(
        this.api.addScoresheet(this.newMatch(), this.newTeamA(), this.newTeamB(), a, b),
      );
      this.newMatch.set('');
      this.newTeamA.set('');
      this.newTeamB.set('');
      this.lineupA.set(Array(LINEUP_SIZE).fill(''));
      this.lineupB.set(Array(LINEUP_SIZE).fill(''));
      if (this.page() === 0) this.reloadActive();
      else this.page.set(0);
      this.msg.set('تمت إضافة المباراة.');
      this.toast.success('تمت إضافة المباراة.');
    } catch (e: unknown) {
      const reason = this.apiMsg(e) ?? 'خطأ — يلزم اسم مباراة وفريقان و11 لاعبًا لكل تشكيلة.';
      this.msg.set(reason);
      this.toast.error(reason);
    }
  }

  async removePlayer(id: number): Promise<void> {
    try {
      await firstValueFrom(this.api.deletePlayer(id));
    } catch (e: unknown) {
      if (this.denyIf401(e)) return;
      this.msg.set('تعذّر الحذف — أعد المحاولة.');
      return;
    }
    this.afterDelete(this.playersRes.value()?.content.length ?? 0);
  }

  async removeIhbid(id: number): Promise<void> {
    try {
      await firstValueFrom(this.api.deleteIhbid(id));
    } catch (e: unknown) {
      if (this.denyIf401(e)) return;
      this.msg.set('تعذّر الحذف — أعد المحاولة.');
      return;
    }
    this.afterDelete(this.ihbidRes.value()?.content.length ?? 0);
  }

  async removeOffside(id: number): Promise<void> {
    try {
      await firstValueFrom(this.api.deleteOffside(id));
    } catch (e: unknown) {
      if (this.denyIf401(e)) return;
      this.msg.set('تعذّر الحذف — أعد المحاولة.');
      return;
    }
    this.afterDelete(this.offsideRes.value()?.content.length ?? 0);
  }

  async removeTop10(id: number): Promise<void> {
    try {
      await firstValueFrom(this.api.deleteTop10(id));
    } catch (e: unknown) {
      if (this.denyIf401(e)) return;
      this.msg.set('تعذّر الحذف — أعد المحاولة.');
      return;
    }
    this.afterDelete(this.top10Res.value()?.content.length ?? 0);
  }

  async removeScoresheet(id: number): Promise<void> {
    try {
      await firstValueFrom(this.api.deleteScoresheet(id));
    } catch (e: unknown) {
      if (this.denyIf401(e)) return;
      this.msg.set('تعذّر الحذف — أعد المحاولة.');
      return;
    }
    this.afterDelete(this.scoresheetRes.value()?.content.length ?? 0);
  }

  private afterDelete(leftOnPage: number): void {
    if (leftOnPage <= 1 && this.page() > 0) this.page.update((p) => p - 1);
    else this.reloadActive();
  }

  private denyIf401(e: unknown): boolean {
    if (typeof e === 'object' && e !== null && 'status' in e) {
      if ((e as { status: unknown }).status === 401) {
        this.api.lock();
        this.adminError.set('كلمة المرور غير صحيحة.');
        return true;
      }
    }
    return false;
  }

  private apiMsg(e: unknown): string | null {
    if (typeof e === 'object' && e !== null && 'error' in e) {
      const err = (e as { error?: { message?: unknown } }).error;
      if (err && typeof err.message === 'string' && err.message) return err.message;
    }
    return null;
  }
}
