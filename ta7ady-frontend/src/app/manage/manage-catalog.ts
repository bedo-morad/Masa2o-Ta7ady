import { httpResource } from '@angular/common/http';
import { computed, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import {
  API_BASE,
  AnameenSubject,
  ApiService,
  Page,
  Pool,
  RiskQuestion,
  WhoPicturePhoto,
} from '../api.service';

const SIZE = 20;
type PlayerRow = { id: number; playerName: string };
type IhbidRow = { id: number; questionText: string; answerText: string };
type OffsideRow = { id: number; ruleText: string };
type Top10Row = { id: number; prompt: string; answers: string[] };
type ScoresheetRow = {
  id: number;
  matchLabel: string;
  teamA: string;
  teamB: string;
  lineupA: string[];
  lineupB: string[];
};
type BankRow = { id: number; question: string; answer: string };
type RiskRow = { id: number; genre: string; questions: RiskQuestion[] };

/**
 * The small boundary future Pool editors use to coordinate with Manage.
 * Catalog lifecycle, authorization, feedback, and cross-row coordination stay
 * with the host; each editor keeps its own draft, validation, and mutation.
 */
export interface ManageEditorHost {
  readonly authorization: () => boolean;
  requestEdit(id: number): void;
  cancelEdit(): void;
  refreshAfterMutation(): void;
  reportFeedback(message: string, intent: 'success' | 'error'): void;
  clearFeedback(): void;
  refreshAfterAdd(): void;
  reportMutationFailure(error: unknown, fallback: string): void;
  reportEditFailure(error: unknown, fallback: string): void;
  completeEdit(message: string): void;
}

/** Owns the Manage catalog lifecycle; editors consume its narrow host contract rather than resources. */
export class ManageCatalog {
  readonly pool = signal<Pool>('players');
  readonly page = signal(0);
  readonly playersRes = httpResource<Page<PlayerRow>>(() => this.url('players'));
  readonly ihbidRes = httpResource<Page<IhbidRow>>(() => this.url('ihbid'));
  readonly offsideRes = httpResource<Page<OffsideRow>>(() => this.url('offside'));
  readonly top10Res = httpResource<Page<Top10Row>>(() => this.url('top10'));
  readonly scoresheetRes = httpResource<Page<ScoresheetRow>>(() => this.url('scoresheet'));
  readonly bankRes = httpResource<Page<BankRow>>(() => this.url('bank'));
  readonly riskRes = httpResource<Page<RiskRow>>(() => this.url('risk'));
  readonly anameenRes = httpResource<Page<AnameenSubject>>(() => this.url('anameen'));
  readonly whopictureRes = httpResource<Page<WhoPicturePhoto>>(() => this.url('whopicture'));

  readonly playerRows = computed(() => this.playersRes.value()?.content ?? []);
  readonly ihbidRows = computed(() => this.ihbidRes.value()?.content ?? []);
  readonly offsideRows = computed(() => this.offsideRes.value()?.content ?? []);
  readonly top10Rows = computed(() => this.top10Res.value()?.content ?? []);
  readonly scoresheetRows = computed(() => this.scoresheetRes.value()?.content ?? []);
  readonly bankRows = computed(() => this.bankRes.value()?.content ?? []);
  readonly riskRows = computed(() => this.riskRes.value()?.content ?? []);
  readonly anameenRows = computed(() => this.anameenRes.value()?.content ?? []);
  readonly whopictureRows = computed(() => this.whopictureRes.value()?.content ?? []);
  readonly activePage = computed<Page<unknown> | undefined>(() => this.pageFor(this.pool()));
  readonly totalElements = computed(() => this.activePage()?.totalElements ?? 0);
  readonly totalPages = computed(() => this.activePage()?.totalPages ?? 0);
  readonly loading = computed(() =>
    [
      this.playersRes,
      this.ihbidRes,
      this.offsideRes,
      this.top10Res,
      this.scoresheetRes,
      this.bankRes,
      this.riskRes,
      this.anameenRes,
      this.whopictureRes,
    ].some((resource) => resource.isLoading()),
  );

  constructor(private readonly api: ApiService) {}

  private url(pool: Pool): string | undefined {
    return this.pool() === pool
      ? `${API_BASE}/${pool}/all?page=${this.page()}&size=${SIZE}&sort=id,desc`
      : undefined;
  }

  private pageFor(pool: Pool): Page<unknown> | undefined {
    if (pool === 'players') return this.playersRes.value() as Page<unknown> | undefined;
    if (pool === 'ihbid') return this.ihbidRes.value() as Page<unknown> | undefined;
    if (pool === 'offside') return this.offsideRes.value() as Page<unknown> | undefined;
    if (pool === 'top10') return this.top10Res.value() as Page<unknown> | undefined;
    if (pool === 'scoresheet') return this.scoresheetRes.value() as Page<unknown> | undefined;
    if (pool === 'bank') return this.bankRes.value() as Page<unknown> | undefined;
    if (pool === 'risk') return this.riskRes.value() as Page<unknown> | undefined;
    if (pool === 'anameen') return this.anameenRes.value() as Page<unknown> | undefined;
    return this.whopictureRes.value() as Page<unknown> | undefined;
  }

  select(pool: Pool): void {
    this.pool.set(pool);
    this.page.set(0);
  }
  prev(): void {
    if (this.page() > 0) this.page.update((p) => p - 1);
  }
  next(): void {
    if (this.page() + 1 < this.totalPages()) this.page.update((p) => p + 1);
  }
  reloadActive(): void {
    this.pageForResource(this.pool()).reload();
  }

  async delete(
    pool: Pool,
    id: number,
    onUnauthorized: () => void,
    onError: () => void,
  ): Promise<void> {
    try {
      await firstValueFrom(this.api.del(pool, id));
    } catch (error: unknown) {
      if (this.isUnauthorized(error)) onUnauthorized();
      else onError();
      return;
    }
    const leftOnPage = this.pageFor(pool)?.content.length ?? 0;
    if (leftOnPage <= 1 && this.page() > 0) this.page.update((p) => p - 1);
    else this.reloadActive();
  }

  private isUnauthorized(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'status' in error &&
      (error as { status?: unknown }).status === 401
    );
  }

  private pageForResource(pool: Pool) {
    if (pool === 'players') return this.playersRes;
    if (pool === 'ihbid') return this.ihbidRes;
    if (pool === 'offside') return this.offsideRes;
    if (pool === 'top10') return this.top10Res;
    if (pool === 'scoresheet') return this.scoresheetRes;
    if (pool === 'bank') return this.bankRes;
    if (pool === 'risk') return this.riskRes;
    if (pool === 'anameen') return this.anameenRes;
    return this.whopictureRes;
  }
}

export const MANAGE_PAGE_SIZE = SIZE;
