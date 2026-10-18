import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { HotToastService } from '@ngxpert/hot-toast';
import { ApiService, Pool } from '../api.service';
import { ManageComponent } from './manage.component';

// These assertions deliberately enter through the rendered Manage page, not a
// separately instantiated model: a correct payload owner cannot detect a broken
// ngModel/name/submit binding in its child template.
describe('Manage rendered Pool forms', () => {
  let fixture: ComponentFixture<ManageComponent>;
  let http: HttpTestingController;
  const methods = [
    'addPlayer',
    'addIhbid',
    'addOffside',
    'addTop10',
    'addScoresheet',
    'addBank',
    'addRisk',
    'addAnameen',
    'addWhopicture',
  ] as const;
  let api: Record<(typeof methods)[number], ReturnType<typeof vi.fn>>;

  beforeEach(async () => {
    api = Object.fromEntries(
      methods.map((method) => [method, vi.fn(() => of({ id: 7 }))]),
    ) as typeof api;
    await TestBed.configureTestingModule({
      imports: [ManageComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        {
          provide: ApiService,
          useValue: { ...api, adminPassword: signal<string | null>('admin') },
        },
        { provide: NgbModal, useValue: { open: vi.fn() } },
        { provide: HotToastService, useValue: { success: vi.fn(), error: vi.fn() } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(ManageComponent);
    http = TestBed.inject(HttpTestingController);
  });

  function flushCatalog(content: unknown[] = []): void {
    fixture.detectChanges();
    for (const req of http.match((request) => request.url.includes('/all'))) {
      req.flush({ content, totalElements: content.length, totalPages: 1, number: 0, size: 20 });
    }
    fixture.detectChanges();
  }

  afterEach(() => {
    flushCatalog();
    http.verify();
  });

  const cases: { pool: Pool; method: (typeof methods)[number]; name: string; count: number }[] = [
    { pool: 'players', method: 'addPlayer', name: 'np', count: 1 },
    { pool: 'ihbid', method: 'addIhbid', name: 'nq', count: 2 },
    { pool: 'offside', method: 'addOffside', name: 'nr', count: 1 },
    { pool: 'top10', method: 'addTop10', name: 'ntp', count: 14 },
    { pool: 'scoresheet', method: 'addScoresheet', name: 'nm', count: 25 },
    { pool: 'bank', method: 'addBank', name: 'nbq', count: 2 },
    { pool: 'risk', method: 'addRisk', name: 'ngr', count: 9 },
    { pool: 'anameen', method: 'addAnameen', name: 'nsubj', count: 6 },
    { pool: 'whopicture', method: 'addWhopicture', name: 'ntitle', count: 13 },
  ];

  for (const testCase of cases) {
    it(`${testCase.pool}: keeps the original form above import and submits bound inputs`, async () => {
      fixture.componentInstance.select(testCase.pool);
      flushCatalog();
      await fixture.whenStable();
      fixture.detectChanges();
      const root = fixture.nativeElement as HTMLElement;
      const form = root.querySelector('form.add') as HTMLFormElement;
      const importer = root.querySelector('app-import-panel')!;
      expect(form).not.toBeNull();
      expect(
        form.compareDocumentPosition(importer) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
      const fields = [...form.querySelectorAll('input')];
      expect(fields).toHaveLength(testCase.count);
      expect(fields[0].name).toBe(testCase.name);
      expect(form.querySelector('button[type=submit] .fa-plus')).not.toBeNull();
      for (const [index, field] of fields.entries()) {
        field.value = `value ${index}`;
        field.dispatchEvent(new Event('input', { bubbles: true }));
      }
      await Promise.resolve();
      fixture.detectChanges();
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      await Promise.resolve();
      expect(api[testCase.method]).toHaveBeenCalledTimes(1);
      const values = fields.map((_, i) => `value ${i}`);
      const expected: Record<Pool, unknown[]> = {
        players: [values[0]],
        ihbid: values.slice(0, 2),
        offside: [values[0]],
        top10: [values[0], values.slice(1)],
        scoresheet: [values[0], values[1], values[13], values.slice(2, 13), values.slice(14)],
        bank: values.slice(0, 2),
        risk: [
          values[0],
          [5, 10, 20, 40].map((points, i) => ({
            points,
            question: values[1 + i * 2],
            answer: values[2 + i * 2],
          })),
        ],
        anameen: [values[0], values.slice(1)],
        whopicture: [values[0], values[1], values.slice(2)],
      };
      expect(api[testCase.method]).toHaveBeenCalledWith(...expected[testCase.pool]);
      flushCatalog();
    });
  }

  it('keeps player catalog items directly in the page list', async () => {
    flushCatalog([{ id: 2, playerName: 'Original player' }]);
    await fixture.whenStable();
    fixture.detectChanges();
    const list = fixture.nativeElement.querySelector('.rows') as HTMLUListElement;
    expect(list.querySelector(':scope > li')?.textContent).toContain('Original player');
    expect(list.querySelector('ul')).toBeNull();
  });

  it('retains the Top-10 edit label, input binding, and cancel flow', async () => {
    const row = {
      id: 8,
      prompt: 'Original prompt',
      answers: Array.from({ length: 13 }, (_, i) => `answer ${i}`),
    };
    fixture.componentInstance.select('top10');
    flushCatalog([row]);
    await fixture.whenStable();
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    (root.querySelector('.edit-btn') as HTMLButtonElement).click();
    fixture.detectChanges();
    await Promise.resolve();
    fixture.detectChanges();
    const input = root.querySelector('input[name=editPrompt]') as HTMLInputElement;
    expect(input.getAttribute('aria-label')).toBe('تعديل عنوان القائمة');
    expect(input.placeholder).toBe('عنوان القائمة');
    expect(input.value).toBe(row.prompt);
    (root.querySelector('.edit-actions .cancel') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(root.querySelector('form.edit')).toBeNull();
    expect(fixture.componentInstance.selection.editingId()).toBeNull();
  });
});
