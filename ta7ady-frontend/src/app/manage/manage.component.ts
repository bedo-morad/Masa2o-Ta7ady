import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { httpResource } from '@angular/common/http';
import { API_BASE, ApiService, Page, Pool } from '../api.service';
import { ImportPanelComponent } from './import/import-panel.component';

const SIZE = 20;

@Component({
  selector: 'app-manage',
  standalone: true,
  imports: [FormsModule, RouterLink, ImportPanelComponent],
  templateUrl: './manage.component.html',
  styleUrl: './manage.component.scss',
})
export class ManageComponent {
  readonly api = inject(ApiService);

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
  readonly newTop10Answers = signal('');
  readonly newMatch = signal('');
  readonly newTeamA = signal('');
  readonly newTeamB = signal('');
  readonly newLineupA = signal('');
  readonly newLineupB = signal('');

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
    Page<{ id: number; matchLabel: string; teamA: string; teamB: string }>
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
  }

  prev(): void {
    if (this.page() > 0) this.page.update((p) => p - 1);
  }

  next(): void {
    if (this.page() + 1 < this.totalPages()) this.page.update((p) => p + 1);
  }

  unlockAdmin(): void {
    const pw = this.adminPw().trim();
    if (!pw) {
      this.adminError.set('أدخل كلمة المرور.');
      return;
    }
    this.api.unlock(pw);
    this.adminPw.set('');
    this.adminError.set('');
    this.msg.set('تم تفعيل وضع الإدارة لهذه الجلسة — ظهرت أزرار الحذف.');
  }

  lockAdmin(): void {
    this.api.lock();
    this.msg.set('تم قفل وضع الإدارة — أُخفيت أزرار الحذف.');
  }

  onImported(): void {
    this.reloadActive();
    this.msg.set('تم الاستيراد — القائمة محدثة.');
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
    } catch (e: unknown) {
      this.msg.set(this.apiMsg(e) ?? 'خطأ — الاسم قصير أو مكرر.');
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
    } catch {
      this.msg.set('خطأ — تأكد من طول السؤال والجواب.');
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
    } catch {
      this.msg.set('خطأ — القاعدة قصيرة.');
    }
  }

  async addTop10(): Promise<void> {
    this.msg.set('');
    try {
      await firstValueFrom(this.api.addTop10(this.newTop10Prompt(), this.lines(this.newTop10Answers())));
      this.newTop10Prompt.set('');
      this.newTop10Answers.set('');
      if (this.page() === 0) this.reloadActive();
      else this.page.set(0);
      this.msg.set('تمت إضافة قائمة التوب 10.');
    } catch {
      this.msg.set('خطأ — يلزم عنوان و13 إجابة مميزة.');
    }
  }

  async addScoresheet(): Promise<void> {
    this.msg.set('');
    try {
      await firstValueFrom(
        this.api.addScoresheet(
          this.newMatch(),
          this.newTeamA(),
          this.newTeamB(),
          this.lines(this.newLineupA()),
          this.lines(this.newLineupB()),
        ),
      );
      this.newMatch.set('');
      this.newTeamA.set('');
      this.newTeamB.set('');
      this.newLineupA.set('');
      this.newLineupB.set('');
      if (this.page() === 0) this.reloadActive();
      else this.page.set(0);
      this.msg.set('تمت إضافة المباراة.');
    } catch {
      this.msg.set('خطأ — يلزم اسم مباراة وفريقان و11 لاعبًا لكل تشكيلة.');
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

  private lines(text: string): string[] {
    return text
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
  }

  private apiMsg(e: unknown): string | null {
    if (typeof e === 'object' && e !== null && 'error' in e) {
      const err = (e as { error?: { message?: unknown } }).error;
      if (err && typeof err.message === 'string') return err.message;
    }
    return null;
  }
}
