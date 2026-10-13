import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { httpResource } from '@angular/common/http';
import { API_BASE, ApiService, Page } from '../api.service';

type Pool = 'players' | 'ihbid' | 'offside';

const SIZE = 20;

@Component({
  selector: 'app-manage',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './manage.component.html',
  styleUrl: './manage.component.scss',
})
export class ManageComponent {
  private api = inject(ApiService);

  readonly pool = signal<Pool>('players');
  readonly page = signal(0);
  readonly msg = signal('');

  readonly newPlayer = signal('');
  readonly newQuestion = signal('');
  readonly newAnswer = signal('');
  readonly newRule = signal('');

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

  readonly playerRows = computed(() => this.playersRes.value()?.content ?? []);
  readonly ihbidRows = computed(() => this.ihbidRes.value()?.content ?? []);
  readonly offsideRows = computed(() => this.offsideRes.value()?.content ?? []);

  readonly totalElements = computed(() => this.activePage()?.totalElements ?? 0);
  readonly totalPages = computed(() => this.activePage()?.totalPages ?? 0);
  readonly loading = computed(
    () => this.playersRes.isLoading() || this.ihbidRes.isLoading() || this.offsideRes.isLoading(),
  );

  private activePage() {
    if (this.pool() === 'players') return this.playersRes.value();
    if (this.pool() === 'ihbid') return this.ihbidRes.value();
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

  private reloadActive(): void {
    if (this.pool() === 'players') this.playersRes.reload();
    else if (this.pool() === 'ihbid') this.ihbidRes.reload();
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

  async removePlayer(id: number): Promise<void> {
    await firstValueFrom(this.api.deletePlayer(id));
    this.afterDelete(this.playersRes.value()?.content.length ?? 0);
  }

  async removeIhbid(id: number): Promise<void> {
    await firstValueFrom(this.api.deleteIhbid(id));
    this.afterDelete(this.ihbidRes.value()?.content.length ?? 0);
  }

  async removeOffside(id: number): Promise<void> {
    await firstValueFrom(this.api.deleteOffside(id));
    this.afterDelete(this.offsideRes.value()?.content.length ?? 0);
  }

  private afterDelete(leftOnPage: number): void {
    if (leftOnPage <= 1 && this.page() > 0) this.page.update((p) => p - 1);
    else this.reloadActive();
  }

  private apiMsg(e: unknown): string | null {
    if (typeof e === 'object' && e !== null && 'error' in e) {
      const err = (e as { error?: { message?: unknown } }).error;
      if (err && typeof err.message === 'string') return err.message;
    }
    return null;
  }
}
