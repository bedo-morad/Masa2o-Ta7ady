import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { HotToastService } from '@ngxpert/hot-toast';
import { ApiService } from '../api.service';
import { ManageComponent } from './manage.component';

const toastStub = () => ({ success: vi.fn(), error: vi.fn() });
const modalStub = () => ({ open: vi.fn(), dismissAll: vi.fn() });

describe('ManageComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ManageComponent],
      providers: [
        provideHttpClient(),
        provideRouter([]),
        { provide: NgbModal, useValue: modalStub() },
        { provide: HotToastService, useValue: toastStub() },
      ],
    }).compileComponents();
  });

  it('creates on the shared player pool', () => {
    const fixture = TestBed.createComponent(ManageComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
    expect(fixture.componentInstance.pool()).toBe('players');
  });

  it('switches pools and resets paging', () => {
    const c = TestBed.createComponent(ManageComponent).componentInstance;
    c.page.set(3);
    c.select('ihbid');
    expect(c.pool()).toBe('ihbid');
    expect(c.page()).toBe(0);
  });

  it('supports all five v2 pools', () => {
    const c = TestBed.createComponent(ManageComponent).componentInstance;
    for (const p of ['players', 'ihbid', 'offside', 'top10', 'scoresheet'] as const) {
      c.select(p);
      expect(c.pool()).toBe(p);
      expect(c.page()).toBe(0);
    }
  });

  it('shows a lock icon-button in the topbar that opens the admin modal', () => {
    const modal = modalStub();
    TestBed.overrideProvider(NgbModal, { useValue: modal });
    const fixture = TestBed.createComponent(ManageComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const btn = el.querySelector('.lock-btn') as HTMLButtonElement | null;
    expect(btn).not.toBeNull();
    btn!.click();
    fixture.detectChanges();
    expect(modal.open).toHaveBeenCalled();
  });

  it('pool tabs have no sublabel', () => {
    const fixture = TestBed.createComponent(ManageComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.pools .sub')).toBeNull();
    expect(el.textContent).toContain('أسماء اللاعبين');
  });
});

describe('ManageComponent admin unlock', () => {
  async function setupAdmin() {
    const adminPassword = signal<string | null>(null);
    const apiStub = {
      adminPassword,
      get unlocked(): boolean {
        return adminPassword() !== null;
      },
      unlock: vi.fn((pw: string) => adminPassword.set(pw)),
      lock: vi.fn(() => adminPassword.set(null)),
      bulk: vi.fn(() => of([])),
      deletePlayer: vi.fn(() => of(undefined)),
      deleteIhbid: vi.fn(() => of(undefined)),
      deleteOffside: vi.fn(() => of(undefined)),
      deleteTop10: vi.fn(() => of(undefined)),
      deleteScoresheet: vi.fn(() => of(undefined)),
    };
    await TestBed.configureTestingModule({
      imports: [ManageComponent],
      providers: [
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: ApiService, useValue: apiStub },
        { provide: NgbModal, useValue: modalStub() },
        { provide: HotToastService, useValue: toastStub() },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(ManageComponent);
    fixture.detectChanges();
    const httpMock = TestBed.inject(HttpTestingController);
    const req = httpMock.expectOne((r) => r.url.includes('/players/all'));
    req.flush({ content: [{ id: 1, playerName: 'لاعب للاختبار' }], totalElements: 1, totalPages: 1, number: 0, size: 20 });
    fixture.detectChanges();
    return { fixture, apiStub, httpMock };
  }

  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
  });

  it('hides delete buttons while locked and shows no inline unlock card', async () => {
    const { fixture } = await setupAdmin();
    const c = fixture.componentInstance;
    expect(c.adminOn()).toBe(false);
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.del')).toBeNull();
    // Unlock form lives inside the modal popup now, not inline on the page.
    expect(el.querySelector('.admin-locked')).toBeNull();
    expect(el.querySelector('.lock-btn')).not.toBeNull();
  });

  it('shows deletes after unlock and re-hides them on a 401 delete', async () => {
    const { fixture, apiStub } = await setupAdmin();
    const c = fixture.componentInstance;
    const el = fixture.nativeElement as HTMLElement;

    c.adminPw.set('secret');
    c.unlockAdmin();
    fixture.detectChanges();
    expect(c.adminOn()).toBe(true);
    expect(apiStub.unlock).toHaveBeenCalledWith('secret');
    expect(el.querySelector('.del')).not.toBeNull();

    apiStub.deletePlayer.mockReturnValueOnce(throwError(() => ({ status: 401 })));
    await c.removePlayer(1);
    fixture.detectChanges();
    expect(apiStub.lock).toHaveBeenCalled();
    expect(c.adminOn()).toBe(false);
    expect(el.querySelector('.del')).toBeNull();
    expect(c.adminError()).toContain('كلمة المرور غير صحيحة');
  });
});

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
      deletePlayer: vi.fn(() => of(undefined)),
      deleteIhbid: vi.fn(() => of(undefined)),
      deleteOffside: vi.fn(() => of(undefined)),
      deleteTop10: vi.fn(() => of(undefined)),
      deleteScoresheet: vi.fn(() => of(undefined)),
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
    c.newTop10Prompt.set('عنوان');
    c.top10Answers.set(Array(13).fill('إجابة').map((v, i) => (i === 12 ? '' : v)));
    await c.addTop10();
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
    c.newTop10Prompt.set('عنوان');
    c.top10Answers.set(Array.from({ length: 13 }, (_, i) => `إجابة ${i + 1}`));
    await c.addTop10();
    expect(apiStub.addTop10).toHaveBeenCalledWith(
      'عنوان',
      Array.from({ length: 13 }, (_, i) => `إجابة ${i + 1}`),
    );
    expect(toast.success).toHaveBeenCalled();
    expect(c.top10Answers().every((a) => a === '')).toBe(true);
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
    c.newTop10Prompt.set('عنوان');
    c.top10Answers.set(Array.from({ length: 13 }, (_, i) => `إجابة ${i + 1}`));
    apiStub.addTop10.mockReturnValueOnce(
      throwError(() => ({ error: { message: 'سبب من الخادم' } })),
    );
    await c.addTop10();
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
    c.newMatch.set('نهائي');
    c.newTeamA.set('أ');
    c.newTeamB.set('ب');
    c.lineupA.set(Array(11).fill('لاعب'));
    c.lineupB.set(Array(11).fill('لاعب').map((v, i) => (i === 0 ? '' : v)));
    await c.addScoresheet();
    expect(apiStub.addScoresheet).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalled();
  });
});
