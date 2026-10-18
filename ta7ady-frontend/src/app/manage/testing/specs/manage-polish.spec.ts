import { ComponentFixture, TestBed } from '@angular/core/testing';

import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { HotToastService } from '@ngxpert/hot-toast';
import { ApiService } from '../../../api.service';
import { ManageComponent } from '../../manage.component';

const toastStub = () => ({ success: vi.fn(), error: vi.fn() });
const modalStub = () => ({ open: vi.fn(), dismissAll: vi.fn() });

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
    httpMock
      .expectOne((r) => r.url.includes('/top10/all'))
      .flush({
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
    expect(c.selection.expandedId()).toBe(1);
    const reveal = el.querySelector('.reveal') as HTMLElement;
    expect(reveal.querySelectorAll('li').length).toBe(13);
    expect(reveal.textContent).toContain('إجابة 13');

    (el.querySelector('.row-main') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(c.selection.expandedId()).toBeNull();
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
    expect(c.selection.expandedId()).toBe(2);
    expect(el.querySelectorAll('.managed-row.open').length).toBe(1);
    expect(el.querySelectorAll('.reveal').length).toBe(1);

    c.select('ihbid');
    fixture.detectChanges();
    expect(c.selection.expandedId()).toBeNull();
    httpMock
      .expectOne((r) => r.url.includes('/ihbid/all'))
      .flush({ content: [], totalElements: 0, totalPages: 0, number: 0, size: 20 });
  });

  it('scoresheet rows collapse to one line and expand to both lineups', async () => {
    const { fixture, httpMock } = await setupRows();
    const c = fixture.componentInstance;
    await showPool(fixture, httpMock, 'scoresheet', [
      {
        id: 7,
        matchLabel: 'نهائي المونديال',
        teamA: 'الأرجنتين',
        teamB: 'فرنسا',
        lineupA: Array.from({ length: 11 }, (_, i) => `أ${i + 1}`),
        lineupB: Array.from({ length: 11 }, (_, i) => `ب${i + 1}`),
      },
    ]);
    const el = fixture.nativeElement as HTMLElement;
    const head = el.querySelector('.managed-row .row-head') as HTMLElement;
    expect(head.textContent).toContain('نهائي المونديال');
    expect(head.querySelector('.fa-chevron-down')).not.toBeNull();
    // Delete stays reachable on the collapsed single line (admin is unlocked).
    expect(head.querySelector('.del')).not.toBeNull();
    expect(el.querySelector('.reveal')).toBeNull();

    (el.querySelector('.row-main') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(c.selection.expandedId()).toBe(7);
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
