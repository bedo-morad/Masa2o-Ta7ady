import { TestBed } from '@angular/core/testing';

import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { HotToastService } from '@ngxpert/hot-toast';
import { ApiService } from '../../../services/api.service';
import { ManageComponent } from '../../manage.component';

const toastStub = () => ({ success: vi.fn(), error: vi.fn() });
const modalStub = () => ({ open: vi.fn(), dismissAll: vi.fn() });

describe('ManageComponent add forms', () => {
  async function setupForms() {
    const adminPassword = signal<string | null>(null);
    const toast = toastStub();
    const apiStub = {
      adminPassword,
      get unlocked(): boolean {
        return adminPassword() !== null;
      },
      unlock: vi.fn((pw: string) => adminPassword.set(pw)),
      lock: vi.fn(() => adminPassword.set(null)),
      bulk: vi.fn(() => of([])),
      addPlayer: vi.fn(() => of({ id: 1, playerName: 'x' })),
      addIhbid: vi.fn(() => of({ id: 1 })),
      addOffside: vi.fn(() => of({ id: 1 })),
      addTop10: vi.fn(() => of({ id: 1, prompt: 'p', answers: [] })),
      addScoresheet: vi.fn(() => of({ id: 1 })),
      del: vi.fn(() => of(undefined)),
    };
    await TestBed.configureTestingModule({
      imports: [ManageComponent],
      providers: [
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: ApiService, useValue: apiStub },
        { provide: NgbModal, useValue: modalStub() },
        { provide: HotToastService, useValue: toast },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(ManageComponent);
    fixture.detectChanges();
    const httpMock = TestBed.inject(HttpTestingController);
    httpMock
      .expectOne((r) => r.url.includes('/players/all'))
      .flush({ content: [], totalElements: 0, totalPages: 0, number: 0, size: 20 });
    fixture.detectChanges();
    return { fixture, apiStub, toast, httpMock };
  }

  function flushPool(httpMock: HttpTestingController, pool: string): void {
    httpMock
      .expectOne((r) => r.url.includes(`/${pool}/all`))
      .flush({ content: [], totalElements: 0, totalPages: 0, number: 0, size: 20 });
  }

  it('renders 13 separate ranked inputs, rank 1 first', async () => {
    const { fixture, httpMock } = await setupForms();
    fixture.componentInstance.select('top10');
    fixture.detectChanges();
    flushPool(httpMock, 'top10');
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const inputs = el.querySelectorAll('.ranks input');
    expect(inputs.length).toBe(13);
    const ranks = [...el.querySelectorAll('.ranks .rank')].map((s) => s.textContent?.trim());
    expect(ranks[0]).toBe('1');
    expect(ranks).toEqual(Array.from({ length: 13 }, (_, i) => String(i + 1)));
    expect(el.querySelector('.ranks textarea')).toBeNull();
  });

  it('blocks top-10 submit until all 13 answers are filled', async () => {
    const { fixture, apiStub, toast, httpMock } = await setupForms();
    const c = fixture.componentInstance;
    c.select('top10');
    fixture.detectChanges();
    flushPool(httpMock, 'top10');
    c.top10Editor.prompt.set('عنوان');
    c.top10Editor.answers.set(
      Array(13)
        .fill('إجابة')
        .map((v, i) => (i === 12 ? '' : v)),
    );
    await c.top10Editor.add();
    expect(apiStub.addTop10).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalled();
    expect(c.msg()).toContain('13');
  });

  it('submits 13 answers and toasts success', async () => {
    const { fixture, apiStub, toast, httpMock } = await setupForms();
    const c = fixture.componentInstance;
    c.select('top10');
    fixture.detectChanges();
    flushPool(httpMock, 'top10');
    c.top10Editor.prompt.set('عنوان');
    c.top10Editor.answers.set(Array.from({ length: 13 }, (_, i) => `إجابة ${i + 1}`));
    await c.top10Editor.add();
    expect(apiStub.addTop10).toHaveBeenCalledWith(
      'عنوان',
      Array.from({ length: 13 }, (_, i) => `إجابة ${i + 1}`),
    );
    expect(toast.success).toHaveBeenCalled();
    expect(c.top10Editor.answers().every((a) => a === '')).toBe(true);
    // The post-add list reload fires async; drain it if it landed so no
    // HttpTestingController state leaks between tests.
    await new Promise((r) => setTimeout(r, 0));
    for (const req of httpMock.match((r) => r.url.includes('/top10/all'))) {
      req.flush({ content: [], totalElements: 0, totalPages: 0, number: 0, size: 20 });
    }
  });

  it('surfaces the backend error message on top-10 failure', async () => {
    const { fixture, apiStub, toast, httpMock } = await setupForms();
    const c = fixture.componentInstance;
    c.select('top10');
    fixture.detectChanges();
    flushPool(httpMock, 'top10');
    c.top10Editor.prompt.set('عنوان');
    c.top10Editor.answers.set(Array.from({ length: 13 }, (_, i) => `إجابة ${i + 1}`));
    apiStub.addTop10.mockReturnValueOnce(
      throwError(() => ({ error: { message: 'سبب من الخادم' } })),
    );
    await c.top10Editor.add();
    expect(c.msg()).toBe('سبب من الخادم');
    expect(toast.error).toHaveBeenCalledWith('سبب من الخادم');
  });

  it('renders side-by-side team blocks with distinct names and 22 player boxes', async () => {
    const { fixture, httpMock } = await setupForms();
    fixture.componentInstance.select('scoresheet');
    fixture.detectChanges();
    flushPool(httpMock, 'scoresheet');
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelectorAll('.team-name').length).toBe(2);
    expect(el.querySelectorAll('.player-box').length).toBe(22);
    expect(el.querySelectorAll('.team').length).toBe(2);
    expect(el.querySelector('.teams textarea')).toBeNull();
  });

  it('blocks scoresheet submit until both lineups are complete', async () => {
    const { fixture, apiStub, toast, httpMock } = await setupForms();
    const c = fixture.componentInstance;
    c.select('scoresheet');
    fixture.detectChanges();
    flushPool(httpMock, 'scoresheet');
    c.scoresheetEditor.newMatch.set('نهائي');
    c.scoresheetEditor.newTeamA.set('أ');
    c.scoresheetEditor.newTeamB.set('ب');
    c.scoresheetEditor.lineupA.set(Array(11).fill('لاعب'));
    c.scoresheetEditor.lineupB.set(
      Array(11)
        .fill('لاعب')
        .map((v, i) => (i === 0 ? '' : v)),
    );
    await c.scoresheetEditor.add();
    expect(apiStub.addScoresheet).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalled();
  });
  it('renders migrated Pools through explicit renderers and preserves the shared text draft across tabs', async () => {
    const { fixture, httpMock } = await setupForms();
    const c = fixture.componentInstance;
    c.basicDrafts.addPlayer.set('مسودة مشتركة');
    c.select('offside');
    fixture.detectChanges();
    flushPool(httpMock, 'offside');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-offside-renderer')).not.toBeNull();
    expect(c.basicDrafts.addPlayer()).toBe('مسودة مشتركة');
    c.select('players');
    fixture.detectChanges();
    flushPool(httpMock, 'players');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-players-renderer')).not.toBeNull();
    expect(c.basicDrafts.addPlayer()).toBe('مسودة مشتركة');
  });
  it('keeps an add draft and reports the backend message when a Pool add fails', async () => {
    const { fixture, apiStub, httpMock } = await setupForms();
    const c = fixture.componentInstance;
    apiStub.addPlayer.mockReturnValueOnce(throwError(() => ({ error: { message: 'اسم مكرر' } })));
    c.basicDrafts.addPlayer.set('اسم مكرر');
    await c.playersEditor.add();
    expect(c.basicDrafts.addPlayer()).toBe('اسم مكرر');
    expect(c.msg()).toBe('اسم مكرر');
    httpMock.verify();
  });
  it('cancels an admin inline edit at the rendered Manage form seam without a mutation', async () => {
    const { fixture, apiStub, httpMock } = await setupForms();
    const c = fixture.componentInstance;
    c.api.unlock('pw');
    c.playersEditor.start({ id: 1, playerName: 'لاعب' });
    expect(c.selection.editingId()).toBe(1);
    c.selection.cancelEdit();
    expect(c.selection.editingId()).toBeNull();
    httpMock.verify();
  });
});
