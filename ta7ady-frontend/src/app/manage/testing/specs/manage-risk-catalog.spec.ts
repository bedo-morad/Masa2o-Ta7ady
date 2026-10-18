import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { HotToastService } from '@ngxpert/hot-toast';
import { vi } from 'vitest';
import { ManageComponent } from '../../manage.component';

// The Risk catalog's tier/question/answer presentation was not covered by the
// editor validation tests. Keep this at the approved rendered page seam.
describe('Manage Risk catalog details', () => {
  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('reveals the four tiered questions and answers in order, then collapses them', async () => {
    await TestBed.configureTestingModule({
      imports: [ManageComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: NgbModal, useValue: { open: vi.fn() } },
        { provide: HotToastService, useValue: { success: vi.fn(), error: vi.fn() } },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(ManageComponent);
    const http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    http
      .expectOne((request) => request.url.includes('/players/all'))
      .flush({
        content: [],
        totalElements: 0,
        totalPages: 0,
        number: 0,
        size: 20,
      });
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    const riskTab = [...element.querySelectorAll<HTMLButtonElement>('.pools button')].find(
      (button) => button.textContent?.includes('ريسك'),
    )!;
    riskTab.click();
    fixture.detectChanges();
    http
      .expectOne((request) => request.url.includes('/risk/all'))
      .flush({
        content: [
          {
            id: 41,
            genre: 'نهائيات',
            questions: [
              { points: 5, question: 'السؤال الأول', answer: 'الإجابة الأولى' },
              { points: 10, question: 'السؤال الثاني', answer: 'الإجابة الثانية' },
              { points: 20, question: 'السؤال الثالث', answer: 'الإجابة الثالثة' },
              { points: 40, question: 'السؤال الرابع', answer: 'الإجابة الرابعة' },
            ],
          },
        ],
        totalElements: 1,
        totalPages: 1,
        number: 0,
        size: 20,
      });
    await fixture.whenStable();
    fixture.detectChanges();
    const summary = element.querySelector<HTMLButtonElement>('.row-main')!;
    expect(summary.getAttribute('aria-expanded')).toBe('false');
    expect(element.querySelector('.risk-reveal')).toBeNull();
    summary.click();
    fixture.detectChanges();
    const details = [...element.querySelectorAll('.risk-reveal li')];
    expect(details.map((row) => row.querySelector('.tier')?.textContent?.trim())).toEqual([
      '5',
      '10',
      '20',
      '40',
    ]);
    expect(details.map((row) => row.querySelector('.rq')?.textContent?.trim())).toEqual([
      'السؤال الأول',
      'السؤال الثاني',
      'السؤال الثالث',
      'السؤال الرابع',
    ]);
    expect(details.map((row) => row.querySelector('.answer-chip')?.textContent?.trim())).toEqual([
      'الإجابة الأولى',
      'الإجابة الثانية',
      'الإجابة الثالثة',
      'الإجابة الرابعة',
    ]);
    expect(summary.getAttribute('aria-expanded')).toBe('true');
    summary.click();
    fixture.detectChanges();
    expect(element.querySelector('.risk-reveal')).toBeNull();
  });
});
