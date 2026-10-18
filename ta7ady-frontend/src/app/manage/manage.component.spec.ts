import { ComponentFixture, TestBed } from '@angular/core/testing';
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

  it('supports the v4 pools: anameen + whopicture', () => {
    const fixture = TestBed.createComponent(ManageComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const tabs = [...el.querySelectorAll('.pools button')] as HTMLButtonElement[];
    expect(tabs.find((b) => b.textContent?.includes('أنا مين؟'))).toBeTruthy();
    expect(tabs.find((b) => b.textContent?.includes('مين في الصورة'))).toBeTruthy();
    const c = fixture.componentInstance;
    for (const p of ['anameen', 'whopicture'] as const) {
      c.select(p);
      expect(c.pool()).toBe(p);
      expect(c.page()).toBe(0);
      expect(c.expandedId()).toBeNull();
      expect(c.editingId()).toBeNull();
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
      del: vi.fn(() => of(undefined)),
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

    apiStub.del.mockReturnValueOnce(throwError(() => ({ status: 401 })));
    await c.removePlayer(1);
    fixture.detectChanges();
    expect(apiStub.lock).toHaveBeenCalled();
    expect(c.adminOn()).toBe(false);
    expect(el.querySelector('.del')).toBeNull();
    expect(c.adminError()).toContain('كلمة المرور غير صحيحة');
  });
});

describe('ManageComponent catalog lifecycle', () => {
  const pools = [
    'players',
    'ihbid',
    'offside',
    'top10',
    'scoresheet',
    'bank',
    'risk',
    'anameen',
    'whopicture',
  ] as const;

  async function setupCatalog() {
    const adminPassword = signal<string | null>('pw');
    const apiStub = {
      adminPassword,
      unlock: vi.fn(),
      lock: vi.fn(),
      del: vi.fn(() => of(undefined)),
      bulk: vi.fn(() => of([])),
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
    httpMock.expectOne((r) => r.url.includes('/players/all')).flush({
      content: [{ id: 1, playerName: 'لاعب' }],
      totalElements: 21,
      totalPages: 2,
      number: 0,
      size: 20,
    });
    await fixture.whenStable();
    fixture.detectChanges();
    return { fixture, apiStub, httpMock };
  }

  function page(httpMock: HttpTestingController, pool: string, content: unknown[] = []): void {
    httpMock.expectOne((r) => r.url.includes(`/${pool}/all`)).flush({
      content,
      totalElements: content.length,
      totalPages: content.length ? 1 : 0,
      number: 0,
      size: 20,
    });
  }

  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('uses the size-20 descending-id page contract for every Pool', async () => {
    const { fixture, httpMock } = await setupCatalog();
    const c = fixture.componentInstance;
    for (const pool of pools.slice(1)) {
      c.select(pool);
      fixture.detectChanges();
      const request = httpMock.expectOne((r) => r.url.includes(`/${pool}/all`));
      expect(request.request.urlWithParams).toContain('page=0');
      expect(request.request.urlWithParams).toContain('size=20');
      expect(request.request.urlWithParams).toContain('sort=id,desc');
      expect(c.loading()).toBe(true);
      request.flush({ content: [], totalElements: 0, totalPages: 0, number: 0, size: 20 });
      await fixture.whenStable();
    }
  });

  it('preserves page navigation and resets selection state on paging and import refresh', async () => {
    const { fixture, httpMock } = await setupCatalog();
    const c = fixture.componentInstance;
    c.expandedId.set(4);
    c.editingId.set(4);
    c.next();
    fixture.detectChanges();
    const nextRequest = httpMock.expectOne((r) => r.url.includes('/players/all'));
    expect(nextRequest.request.urlWithParams).toContain('page=1');
    expect(c.expandedId()).toBeNull();
    expect(c.editingId()).toBeNull();
    nextRequest.flush({ content: [{ id: 2, playerName: 'لاعب آخر' }], totalElements: 21, totalPages: 2, number: 1, size: 20 });
    await fixture.whenStable();
    c.onImported();
    await new Promise((resolve) => setTimeout(resolve, 0));
    const refresh = httpMock.expectOne((r) => r.url.includes('/players/all'));
    expect(refresh.request.urlWithParams).toContain('page=1');
    refresh.flush({ content: [], totalElements: 0, totalPages: 0, number: 1, size: 20 });
    expect(c.msg()).toBe('تم الاستيراد — القائمة محدثة.');
  });

  it('refreshes after delete and preserves the existing failure and authorization outcomes', async () => {
    const { fixture, apiStub, httpMock } = await setupCatalog();
    const c = fixture.componentInstance;
    await c.removePlayer(1);
    expect(apiStub.del).toHaveBeenCalledWith('players', 1);
    await new Promise((resolve) => setTimeout(resolve, 0));
    const refresh = httpMock.expectOne((r) => r.url.includes('/players/all'));
    refresh.flush({ content: [], totalElements: 0, totalPages: 0, number: 0, size: 20 });

    apiStub.del.mockReturnValueOnce(throwError(() => ({ status: 500 })));
    await c.removePlayer(1);
    expect(c.msg()).toBe('تعذّر الحذف — أعد المحاولة.');

    apiStub.del.mockReturnValueOnce(throwError(() => ({ status: 401 })));
    await c.removePlayer(1);
    expect(apiStub.lock).toHaveBeenCalled();
    expect(c.adminError()).toBe('كلمة المرور غير صحيحة.');
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
    c.scoresheetEditor.newMatch.set('نهائي');
    c.scoresheetEditor.newTeamA.set('أ');
    c.scoresheetEditor.newTeamB.set('ب');
    c.scoresheetEditor.lineupA.set(Array(11).fill('لاعب'));
    c.scoresheetEditor.lineupB.set(Array(11).fill('لاعب').map((v, i) => (i === 0 ? '' : v)));
    await c.scoresheetEditor.add();
    expect(apiStub.addScoresheet).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalled();
  });
});

describe('ManageComponent polish', () => {
  async function setupRows() {
    const adminPassword = signal<string | null>('pw');
    const apiStub = {
      adminPassword,
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
        { provide: HotToastService, useValue: toastStub() },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(ManageComponent);
    fixture.detectChanges();
    const httpMock = TestBed.inject(HttpTestingController);
    httpMock
      .expectOne((r) => r.url.includes('/players/all'))
      .flush({ content: [], totalElements: 0, totalPages: 0, number: 0, size: 20 });
    fixture.detectChanges();
    return { fixture, apiStub, httpMock };
  }

  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
  });

  const answers13 = Array.from({ length: 13 }, (_, i) => `إجابة ${i + 1}`);

  // httpResource resolves through a microtask: flush, let it settle, then render.
  async function showPool(
    fixture: ComponentFixture<ManageComponent>,
    httpMock: HttpTestingController,
    pool: 'top10' | 'scoresheet' | 'ihbid',
    content: unknown[],
  ): Promise<void> {
    fixture.componentInstance.select(pool);
    fixture.detectChanges();
    httpMock
      .expectOne((r) => r.url.includes(`/${pool}/all`))
      .flush({ content, totalElements: content.length, totalPages: 1, number: 0, size: 20 });
    await fixture.whenStable();
    fixture.detectChanges();
  }

  function showTop10(httpMock: HttpTestingController) {
    httpMock.expectOne((r) => r.url.includes('/top10/all')).flush({
      content: [
        { id: 1, prompt: 'أعلى الهدافين', answers: answers13 },
        { id: 2, prompt: 'أفضل الحراس', answers: answers13 },
      ],
      totalElements: 2,
      totalPages: 1,
      number: 0,
      size: 20,
    });
  }

  it('top-10 rows show the prompt with no answer-count suffix', async () => {
    const { fixture, httpMock } = await setupRows();
    await showPool(fixture, httpMock, 'top10', [
      { id: 1, prompt: 'أعلى الهدافين', answers: answers13 },
      { id: 2, prompt: 'أفضل الحراس', answers: answers13 },
    ]);
    const el = fixture.nativeElement as HTMLElement;
    const rows = el.querySelector('.rows') as HTMLElement;
    expect(rows.textContent).toContain('أعلى الهدافين');
    expect(el.querySelector('.rows .sub')).toBeNull();
    expect(rows.textContent).not.toContain('إجابة)');
  });

  it('top-10 rows expand to reveal 13 answers and collapse again', async () => {
    const { fixture, httpMock } = await setupRows();
    const c = fixture.componentInstance;
    await showPool(fixture, httpMock, 'top10', [
      { id: 1, prompt: 'أعلى الهدافين', answers: answers13 },
      { id: 2, prompt: 'أفضل الحراس', answers: answers13 },
    ]);
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.reveal')).toBeNull();

    (el.querySelector('.row-main') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(c.expandedId()).toBe(1);
    const reveal = el.querySelector('.reveal') as HTMLElement;
    expect(reveal.querySelectorAll('li').length).toBe(13);
    expect(reveal.textContent).toContain('إجابة 13');

    (el.querySelector('.row-main') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(c.expandedId()).toBeNull();
    expect(el.querySelector('.reveal')).toBeNull();
  });

  it('accordion keeps a single open row and resets on pool switch', async () => {
    const { fixture, httpMock } = await setupRows();
    const c = fixture.componentInstance;
    await showPool(fixture, httpMock, 'top10', [
      { id: 1, prompt: 'أعلى الهدافين', answers: answers13 },
      { id: 2, prompt: 'أفضل الحراس', answers: answers13 },
    ]);
    const el = fixture.nativeElement as HTMLElement;
    const mains = [...el.querySelectorAll('.row-main')] as HTMLButtonElement[];
    expect(mains.length).toBe(2);

    mains[0].click();
    fixture.detectChanges();
    mains[1].click();
    fixture.detectChanges();
    expect(c.expandedId()).toBe(2);
    expect(el.querySelectorAll('.managed-row.open').length).toBe(1);
    expect(el.querySelectorAll('.reveal').length).toBe(1);

    c.select('ihbid');
    fixture.detectChanges();
    expect(c.expandedId()).toBeNull();
    httpMock
      .expectOne((r) => r.url.includes('/ihbid/all'))
      .flush({ content: [], totalElements: 0, totalPages: 0, number: 0, size: 20 });
  });

  it('scoresheet rows collapse to one line and expand to both lineups', async () => {
    const { fixture, httpMock } = await setupRows();
    const c = fixture.componentInstance;
    await showPool(fixture, httpMock, 'scoresheet', [{
      id: 7,
      matchLabel: 'نهائي المونديال',
      teamA: 'الأرجنتين',
      teamB: 'فرنسا',
      lineupA: Array.from({ length: 11 }, (_, i) => `أ${i + 1}`),
      lineupB: Array.from({ length: 11 }, (_, i) => `ب${i + 1}`),
    }]);
    const el = fixture.nativeElement as HTMLElement;
    const head = el.querySelector('.managed-row .row-head') as HTMLElement;
    expect(head.textContent).toContain('نهائي المونديال');
    expect(head.querySelector('.fa-chevron-down')).not.toBeNull();
    // Delete stays reachable on the collapsed single line (admin is unlocked).
    expect(head.querySelector('.del')).not.toBeNull();
    expect(el.querySelector('.reveal')).toBeNull();

    (el.querySelector('.row-main') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(c.expandedId()).toBe(7);
    const reveal = el.querySelector('.reveal') as HTMLElement;
    expect(reveal.textContent).toContain('الأرجنتين');
    expect(reveal.textContent).toContain('فرنسا');
    expect(reveal.querySelectorAll('li').length).toBe(22);
  });

  it('scoresheet add form has no slot numbers, only order-free boxes', async () => {
    const { fixture, httpMock } = await setupRows();
    fixture.componentInstance.select('scoresheet');
    fixture.detectChanges();
    httpMock
      .expectOne((r) => r.url.includes('/scoresheet/all'))
      .flush({ content: [], totalElements: 0, totalPages: 0, number: 0, size: 20 });
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.slot')).toBeNull();
    const boxes = [...el.querySelectorAll('.player-box')] as HTMLInputElement[];
    expect(boxes.length).toBe(22);
    for (const b of boxes) expect(b.placeholder).toBe('اسم لاعب');
  });

  it('ihbid rows render the answer as a chip with no dash separator', async () => {
    const { fixture, httpMock } = await setupRows();
    await showPool(fixture, httpMock, 'ihbid', [
      { id: 3, questionText: 'كم مرة فازت البرازيل؟', answerText: '5' },
    ]);
    const el = fixture.nativeElement as HTMLElement;
    const row = el.querySelector('.ihbid-row') as HTMLElement;
    expect(row.textContent).toContain('كم مرة فازت البرازيل؟');
    const chip = row.querySelector('.answer-chip') as HTMLElement;
    expect(chip.textContent?.trim()).toBe('5');
    expect(row.textContent).not.toContain('—');
    // Delete stays reachable (admin is unlocked).
    expect(row.querySelector('.del')).not.toBeNull();
  });
});

// SPECV3 §3.1: inline prefilled edit per row, admin-unlocked only, same
// validation as create, duplicate-of-another-row rejected via the backend.
describe('ManageComponent inline edit (SPECV3 3.1)', () => {
  async function setupEdit(unlocked = true) {
    const adminPassword = signal<string | null>(unlocked ? 'pw' : null);
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
      addBank: vi.fn(() => of({ id: 1, question: 'q', answer: 'a' })),
      addRisk: vi.fn(() => of({ id: 1, genre: 'g', questions: [] })),
      update: vi.fn(() => of({})),
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
    httpMock.expectOne((r) => r.url.includes('/players/all')).flush({
      content: [
        { id: 1, playerName: 'لاعب أول' },
        { id: 2, playerName: 'لاعب ثانٍ' },
      ],
      totalElements: 2,
      totalPages: 1,
      number: 0,
      size: 20,
    });
    fixture.detectChanges();
    return { fixture, apiStub, toast, httpMock };
  }

  async function drainList(httpMock: HttpTestingController, pool = 'players'): Promise<void> {
    await new Promise((r) => setTimeout(r, 0));
    for (const req of httpMock.match((r) => r.url.includes(`/${pool}/all`))) {
      req.flush({ content: [], totalElements: 0, totalPages: 0, number: 0, size: 20 });
    }
  }

  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
  });

  it('hides inline edit affordances until admin is unlocked', async () => {
    const { fixture } = await setupEdit(false);
    const c = fixture.componentInstance;
    const el = fixture.nativeElement as HTMLElement;
    expect(c.adminOn()).toBe(false);
    expect(el.querySelector('.edit-btn')).toBeNull();

    c.api.unlock('pw');
    fixture.detectChanges();
    expect(c.adminOn()).toBe(true);
    expect(el.querySelector('.edit-btn')).not.toBeNull();
  });

  it('prefills the row and PUTs the edited value, then reloads', async () => {
    const { fixture, apiStub, httpMock } = await setupEdit();
    const c = fixture.componentInstance;
    const el = fixture.nativeElement as HTMLElement;

    c.startEditPlayer({ id: 1, playerName: 'لاعب أول' });
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(c.editingId()).toBe(1);
    expect(c.editText()).toBe('لاعب أول');
    const box = el.querySelector('.edit > input') as HTMLInputElement;
    expect(box.value).toBe('لاعب أول');
    // Only the editing row swaps to a form; the other row keeps its edit button.
    expect(el.querySelectorAll('.edit').length).toBe(1);

    c.editText.set('لاعب معدّل');
    await c.saveEditPlayer(1);
    expect(apiStub.update).toHaveBeenCalledWith('players', 1, { playerName: 'لاعب معدّل' });
    expect(c.editingId()).toBeNull();
    expect(c.msg()).toContain('تم حفظ');
    await drainList(httpMock);
  });

  it('rejects a duplicate of another row with the backend message', async () => {
    const { fixture, apiStub, toast, httpMock } = await setupEdit();
    const c = fixture.componentInstance;
    apiStub.update.mockReturnValueOnce(
      throwError(() => ({ error: { message: 'اسم اللاعب مستخدم بالفعل' } })),
    );
    c.startEditPlayer({ id: 1, playerName: 'لاعب أول' });
    c.editText.set('لاعب ثانٍ');
    await c.saveEditPlayer(1);
    expect(apiStub.update).toHaveBeenCalledWith('players', 1, { playerName: 'لاعب ثانٍ' });
    expect(c.msg()).toBe('اسم اللاعب مستخدم بالفعل');
    expect(toast.error).toHaveBeenCalledWith('اسم اللاعب مستخدم بالفعل');
    // The row stays open so the referee can fix the clash.
    expect(c.editingId()).toBe(1);
    await drainList(httpMock);
  });

  it('cancel closes the inline form without calling the backend', async () => {
    const { fixture, apiStub, httpMock } = await setupEdit();
    const c = fixture.componentInstance;
    c.startEditPlayer({ id: 1, playerName: 'لاعب أول' });
    c.cancelEdit();
    fixture.detectChanges();
    expect(c.editingId()).toBeNull();
    expect(apiStub.update).not.toHaveBeenCalled();
    await drainList(httpMock);
  });

  it('blocks a top-10 edit until all 13 answers are filled', async () => {
    const { fixture, apiStub, toast, httpMock } = await setupEdit();
    const c = fixture.componentInstance;
    c.select('top10');
    fixture.detectChanges();
    httpMock
      .expectOne((r) => r.url.includes('/top10/all'))
      .flush({ content: [], totalElements: 0, totalPages: 0, number: 0, size: 20 });
    c.startEditTop10({ id: 5, prompt: 'عنوان', answers: Array(13).fill('إجابة') });
    c.setEditTop10Answer(12, '');
    await c.saveEditTop10(5);
    expect(apiStub.update).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalled();
    expect(c.msg()).toContain('13');
  });

  it('blocks a risk edit until the genre and all four tiers are filled', async () => {
    const { fixture, apiStub, toast, httpMock } = await setupEdit();
    const c = fixture.componentInstance;
    c.select('risk');
    fixture.detectChanges();
    httpMock
      .expectOne((r) => r.url.includes('/risk/all'))
      .flush({ content: [], totalElements: 0, totalPages: 0, number: 0, size: 20 });
    c.startEditRisk({
      id: 9,
      genre: 'ريال مدريد',
      questions: [
        { points: 5, question: 'س0', answer: 'ج0' },
        { points: 10, question: 'س1', answer: 'ج1' },
        { points: 20, question: 'س2', answer: 'ج2' },
        { points: 40, question: 'س3', answer: 'ج3' },
      ],
    });
    c.setEditRisk(3, 'answer', '');
    await c.saveEditRisk(9);
    expect(apiStub.update).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalled();
    expect(c.msg()).toContain('أربعة');
  });

  it('adds a bank question and a risk pack through their own endpoints', async () => {
    const { fixture, apiStub, httpMock } = await setupEdit();
    const c = fixture.componentInstance;

    c.newQuestion.set('سؤال البنك');
    c.newAnswer.set('الجواب');
    await c.addBank();
    expect(apiStub.addBank).toHaveBeenCalledWith('سؤال البنك', 'الجواب');
    await drainList(httpMock);

    c.select('risk');
    fixture.detectChanges();
    httpMock
      .expectOne((r) => r.url.includes('/risk/all'))
      .flush({ content: [], totalElements: 0, totalPages: 0, number: 0, size: 20 });
    c.newGenre.set('ريال مدريد');
    for (const i of [0, 1, 2, 3]) {
      c.setNewRisk(i, 'question', `سؤال ${i}`);
      c.setNewRisk(i, 'answer', `جواب ${i}`);
    }
    await c.addRisk();
    expect(apiStub.addRisk).toHaveBeenCalledWith('ريال مدريد', [
      { points: 5, question: 'سؤال 0', answer: 'جواب 0' },
      { points: 10, question: 'سؤال 1', answer: 'جواب 1' },
      { points: 20, question: 'سؤال 2', answer: 'جواب 2' },
      { points: 40, question: 'سؤال 3', answer: 'جواب 3' },
    ]);
    await drainList(httpMock, 'risk');
  });
});

// SPECV4 §4.6: /manage parity for the two v4 pools — list/add/bulk/dry-run
// (generic import panel) /delete + inline prefilled edit, same validation as
// create, duplicates surfacing the backend message, toasts carrying the row id.
describe('ManageComponent v4 pools (anameen + whopicture)', () => {
  const clues5 = Array.from({ length: 5 }, (_, i) => `تلميح ${i + 1}`);
  const names11 = Array.from({ length: 11 }, (_, i) => `لاعب ${i + 1}`);
  const TITLE = 'الأهلي 2021 نهائي دوري أبطال أفريقيا';

  async function setupV4() {
    const adminPassword = signal<string | null>('pw');
    const toast = toastStub();
    const apiStub = {
      adminPassword,
      get unlocked(): boolean {
        return adminPassword() !== null;
      },
      unlock: vi.fn((pw: string) => adminPassword.set(pw)),
      lock: vi.fn(() => adminPassword.set(null)),
      bulk: vi.fn(() => of([])),
      update: vi.fn(() => of({})),
      del: vi.fn(() => of(undefined)),
      addAnameen: vi.fn(() => of({ id: 7, player: 'x', clues: [] })),
      addWhopicture: vi.fn(() => of({ id: 9, title: 'أهلي 2021', photoUrl: 'https://x', players: [] })),
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
    httpMock.expectOne((r) => r.url.includes('/players/all')).flush({
      content: [],
      totalElements: 0,
      totalPages: 0,
      number: 0,
      size: 20,
    });
    fixture.detectChanges();
    return { fixture, apiStub, toast, httpMock };
  }

  async function showV4(
    fixture: ComponentFixture<ManageComponent>,
    httpMock: HttpTestingController,
    pool: 'anameen' | 'whopicture',
    content: unknown[],
  ): Promise<void> {
    fixture.componentInstance.select(pool);
    fixture.detectChanges();
    httpMock
      .expectOne((r) => r.url.includes(`/${pool}/all`))
      .flush({ content, totalElements: content.length, totalPages: 1, number: 0, size: 20 });
    await fixture.whenStable();
    fixture.detectChanges();
  }

  async function drainList(
    httpMock: HttpTestingController,
    pool = 'players',
  ): Promise<void> {
    await new Promise((r) => setTimeout(r, 0));
    for (const req of httpMock.match((r) => r.url.includes(`/${pool}/all`))) {
      req.flush({ content: [], totalElements: 0, totalPages: 0, number: 0, size: 20 });
    }
  }

  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
  });

  it('lists anameen rows and expands to the 5 clues in hard→easy order', async () => {
    const { fixture, httpMock } = await setupV4();
    const c = fixture.componentInstance;
    await showV4(fixture, httpMock, 'anameen', [{ id: 4, player: 'محمد صلاح', clues: clues5 }]);
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.rows')?.textContent).toContain('محمد صلاح');
    expect(el.querySelector('.reveal')).toBeNull();

    (el.querySelector('.row-main') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(c.expandedId()).toBe(4);
    const reveal = el.querySelector('.reveal') as HTMLElement;
    expect(reveal.querySelectorAll('li').length).toBe(5);
    expect(reveal.textContent).toContain('تلميح 5');
  });

  it('lists whopicture rows and expands to the 11 pictured names and preview', async () => {
    const { fixture, httpMock } = await setupV4();
    const c = fixture.componentInstance;
    await showV4(fixture, httpMock, 'whopicture', [
      { id: 11, title: TITLE, photoUrl: 'https://example.com/p.jpg', players: names11 },
    ]);
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.rows')?.textContent).toContain(TITLE);
    expect(el.querySelector('.wp-preview')).toBeNull(); // preview is hidden while collapsed
    (el.querySelector('.row-main') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(c.expandedId()).toBe(11);
    const reveal = el.querySelector('.reveal') as HTMLElement;
    expect(reveal.querySelectorAll('li').length).toBe(11);
    expect(reveal.textContent).toContain('لاعب 11');
    expect(el.querySelector('.wp-preview img')?.getAttribute('src')).toBe(
      'https://example.com/p.jpg',
    );
  });

  it('blocks an anameen add until the name and all 5 clues are filled', async () => {
    const { fixture, apiStub, toast, httpMock } = await setupV4();
    const c = fixture.componentInstance;
    c.select('anameen');
    fixture.detectChanges();
    httpMock
      .expectOne((r) => r.url.includes('/anameen/all'))
      .flush({ content: [], totalElements: 0, totalPages: 0, number: 0, size: 20 });
    c.newSubject.set('محمد صلاح');
    c.newClues.set([...clues5].map((v, i) => (i === 4 ? '' : v)));
    await c.addAnameen();
    expect(apiStub.addAnameen).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalled();
    expect(c.msg()).toContain('خمس');
  });

  it('adds an anameen subject and toasts the new id', async () => {
    const { fixture, apiStub, toast, httpMock } = await setupV4();
    const c = fixture.componentInstance;
    c.select('anameen');
    fixture.detectChanges();
    httpMock
      .expectOne((r) => r.url.includes('/anameen/all'))
      .flush({ content: [], totalElements: 0, totalPages: 0, number: 0, size: 20 });
    c.newSubject.set('محمد صلاح');
    c.newClues.set([...clues5]);
    await c.addAnameen();
    expect(apiStub.addAnameen).toHaveBeenCalledWith('محمد صلاح', clues5);
    expect(toast.success).toHaveBeenCalledWith('تمت إضافة الشخصية (#7).');
    expect(c.newSubject()).toBe('');
    expect(c.newClues().every((v) => v === '')).toBe(true);
    await drainList(httpMock, 'anameen');
  });

  it('surfaces the backend duplicate message on an anameen add', async () => {
    const { fixture, apiStub, toast, httpMock } = await setupV4();
    const c = fixture.componentInstance;
    c.select('anameen');
    fixture.detectChanges();
    httpMock
      .expectOne((r) => r.url.includes('/anameen/all'))
      .flush({ content: [], totalElements: 0, totalPages: 0, number: 0, size: 20 });
    c.newSubject.set('محمد صلاح');
    c.newClues.set([...clues5]);
    apiStub.addAnameen.mockReturnValueOnce(
      throwError(() => ({ error: { message: 'المستخدم موجود بالفعل' } })),
    );
    await c.addAnameen();
    expect(c.msg()).toBe('المستخدم موجود بالفعل');
    expect(toast.error).toHaveBeenCalledWith('المستخدم موجود بالفعل');
  });

  it('blocks a whopicture add until the title, URL and all 11 names are filled', async () => {
    const { fixture, apiStub, toast, httpMock } = await setupV4();
    const c = fixture.componentInstance;
    c.select('whopicture');
    fixture.detectChanges();
    httpMock
      .expectOne((r) => r.url.includes('/whopicture/all'))
      .flush({ content: [], totalElements: 0, totalPages: 0, number: 0, size: 20 });
    c.whopictureEditor.newPhotoUrl.set('https://example.com/p.jpg');
    c.whopictureEditor.newPhotoPlayers.set([...names11]);
    await c.whopictureEditor.add(); // title missing → blocked
    expect(apiStub.addWhopicture).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalled();
    c.whopictureEditor.newPhotoTitle.set(TITLE);
    c.whopictureEditor.newPhotoPlayers.set([...names11].map((v, i) => (i === 10 ? '' : v)));
    await c.whopictureEditor.add(); // 11th name missing → blocked
    expect(apiStub.addWhopicture).not.toHaveBeenCalled();
    expect(c.msg()).toContain('11');
  });

  it('adds a whopicture photo and toasts the new id', async () => {
    const { fixture, apiStub, toast, httpMock } = await setupV4();
    const c = fixture.componentInstance;
    c.select('whopicture');
    fixture.detectChanges();
    httpMock
      .expectOne((r) => r.url.includes('/whopicture/all'))
      .flush({ content: [], totalElements: 0, totalPages: 0, number: 0, size: 20 });
    c.whopictureEditor.newPhotoTitle.set(TITLE);
    c.whopictureEditor.newPhotoUrl.set('https://example.com/p.jpg');
    c.whopictureEditor.newPhotoPlayers.set([...names11]);
    await c.whopictureEditor.add();
    expect(apiStub.addWhopicture).toHaveBeenCalledWith(TITLE, 'https://example.com/p.jpg', names11);
    expect(toast.success).toHaveBeenCalledWith('تمت إضافة الصورة (#9).');
    expect(c.whopictureEditor.newPhotoTitle()).toBe('');
    expect(c.whopictureEditor.newPhotoUrl()).toBe('');
    expect(c.whopictureEditor.newPhotoPlayers().every((v) => v === '')).toBe(true);
    await drainList(httpMock, 'whopicture');
  });

  it('edits an anameen row prefilled and PUTs the same body shape as create', async () => {
    const { fixture, apiStub, toast, httpMock } = await setupV4();
    const c = fixture.componentInstance;
    await showV4(fixture, httpMock, 'anameen', [{ id: 4, player: 'محمد صلاح', clues: clues5 }]);
    const el = fixture.nativeElement as HTMLElement;
    (el.querySelector('.edit-btn') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(c.editingId()).toBe(4);
    expect(c.editSubject()).toBe('محمد صلاح');
    expect(c.editClues()).toEqual(clues5);

    c.editSubject.set('منصور');
    await c.saveEditAnameen(4);
    expect(apiStub.update).toHaveBeenCalledWith('anameen', 4, { player: 'منصور', clues: clues5 });
    expect(toast.success).toHaveBeenCalledWith('تم حفظ تعديل الشخصية (#4).');
    expect(c.editingId()).toBeNull();
    await drainList(httpMock, 'anameen');
  });

  it('rejects an anameen duplicate-of-another via the backend message and stays open', async () => {
    const { fixture, apiStub, toast, httpMock } = await setupV4();
    const c = fixture.componentInstance;
    apiStub.update.mockReturnValueOnce(
      throwError(() => ({ error: { message: 'المستخدم موجود بالفعل' } })),
    );
    c.startEditAnameen({ id: 4, player: 'محمد صلاح', clues: clues5 });
    c.editSubject.set('اسم مستخدم آخر');
    await c.saveEditAnameen(4);
    expect(apiStub.update).toHaveBeenCalledWith('anameen', 4, {
      player: 'اسم مستخدم آخر',
      clues: clues5,
    });
    expect(c.msg()).toBe('المستخدم موجود بالفعل');
    expect(toast.error).toHaveBeenCalledWith('المستخدم موجود بالفعل');
    expect(c.editingId()).toBe(4);
    await drainList(httpMock, 'anameen');
  });

  it('blocks an anameen edit until all 5 clues are filled', async () => {
    const { fixture, apiStub, toast, httpMock } = await setupV4();
    const c = fixture.componentInstance;
    c.select('anameen');
    fixture.detectChanges();
    httpMock
      .expectOne((r) => r.url.includes('/anameen/all'))
      .flush({ content: [], totalElements: 0, totalPages: 0, number: 0, size: 20 });
    c.startEditAnameen({ id: 4, player: 'محمد صلاح', clues: clues5 });
    c.setEditClue(4, '');
    await c.saveEditAnameen(4);
    expect(apiStub.update).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalled();
    expect(c.msg()).toContain('خمس');
  });

  it('edits a whopicture row prefilled and PUTs title + url + 11 names', async () => {
    const { fixture, apiStub, toast, httpMock } = await setupV4();
    const c = fixture.componentInstance;
    await showV4(fixture, httpMock, 'whopicture', [
      { id: 11, title: TITLE, photoUrl: 'https://example.com/p.jpg', players: names11 },
    ]);
    (fixture.nativeElement.querySelector('.edit-btn') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(c.editingId()).toBe(11);
    expect(c.whopictureEditor.editPhotoTitle()).toBe(TITLE);
    expect(c.whopictureEditor.editPhotoUrl()).toBe('https://example.com/p.jpg');
    expect(c.whopictureEditor.editPhotoPlayers()).toEqual(names11);

    c.whopictureEditor.editPhotoTitle.set('ريال مدريد 2022');
    c.whopictureEditor.editPhotoUrl.set('https://example.com/new.jpg');
    await c.whopictureEditor.save(11);
    expect(apiStub.update).toHaveBeenCalledWith('whopicture', 11, {
      title: 'ريال مدريد 2022',
      photoUrl: 'https://example.com/new.jpg',
      players: names11,
    });
    expect(toast.success).toHaveBeenCalledWith('تم حفظ تعديل الصورة (#11).');
    await drainList(httpMock, 'whopicture');
  });

  it('blocks a whopicture edit until the title and all 11 names are filled', async () => {
    const { fixture, apiStub, toast, httpMock } = await setupV4();
    const c = fixture.componentInstance;
    c.select('whopicture');
    fixture.detectChanges();
    httpMock
      .expectOne((r) => r.url.includes('/whopicture/all'))
      .flush({ content: [], totalElements: 0, totalPages: 0, number: 0, size: 20 });
    c.startEditWhopicture({ id: 11, title: TITLE, photoUrl: 'https://example.com/p.jpg', players: names11 });
    c.whopictureEditor.editPhotoTitle.set('');
    await c.whopictureEditor.save(11);
    expect(apiStub.update).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalled();
    c.whopictureEditor.editPhotoTitle.set(TITLE);
    c.whopictureEditor.setEditPlayer(0, '');
    await c.whopictureEditor.save(11);
    expect(apiStub.update).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalled();
    expect(c.msg()).toContain('11');
  });

  it('deletes through the generic admin-gated del(pool, id)', async () => {
    const { fixture, apiStub, httpMock } = await setupV4();
    const c = fixture.componentInstance;
    await showV4(fixture, httpMock, 'anameen', [{ id: 4, player: 'محمد صلاح', clues: clues5 }]);
    await c.removeAnameen(4);
    expect(apiStub.del).toHaveBeenCalledWith('anameen', 4);
    await drainList(httpMock, 'anameen');
  });
});
