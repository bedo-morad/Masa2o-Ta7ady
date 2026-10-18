import { TestBed } from '@angular/core/testing';

import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { HotToastService } from '@ngxpert/hot-toast';
import { ApiService } from '../../../api.service';
import { ManageComponent } from '../../manage.component';

const toastStub = () => ({ success: vi.fn(), error: vi.fn() });
const modalStub = () => ({ open: vi.fn(), dismissAll: vi.fn() });

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
    httpMock
      .expectOne((r) => r.url.includes('/players/all'))
      .flush({
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
    expect(c.admin.adminOn()).toBe(false);
    expect(el.querySelector('.edit-btn')).toBeNull();

    c.api.unlock('pw');
    fixture.detectChanges();
    expect(c.admin.adminOn()).toBe(true);
    expect(el.querySelector('.edit-btn')).not.toBeNull();
  });

  it('prefills the row and PUTs the edited value, then reloads', async () => {
    const { fixture, apiStub, httpMock } = await setupEdit();
    const c = fixture.componentInstance;
    const el = fixture.nativeElement as HTMLElement;

    c.playersEditor.start({ id: 1, playerName: 'لاعب أول' });
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(c.selection.editingId()).toBe(1);
    expect(c.basicDrafts.editText()).toBe('لاعب أول');
    const box = el.querySelector('.edit > input') as HTMLInputElement;
    expect(box.value).toBe('لاعب أول');
    // Only the editing row swaps to a form; the other row keeps its edit button.
    expect(el.querySelectorAll('.edit').length).toBe(1);

    c.basicDrafts.editText.set('لاعب معدّل');
    await c.playersEditor.save(1);
    expect(apiStub.update).toHaveBeenCalledWith('players', 1, { playerName: 'لاعب معدّل' });
    expect(c.selection.editingId()).toBeNull();
    expect(c.msg()).toContain('تم حفظ');
    await drainList(httpMock);
  });

  it('rejects a duplicate of another row with the backend message', async () => {
    const { fixture, apiStub, toast, httpMock } = await setupEdit();
    const c = fixture.componentInstance;
    apiStub.update.mockReturnValueOnce(
      throwError(() => ({ error: { message: 'اسم اللاعب مستخدم بالفعل' } })),
    );
    c.playersEditor.start({ id: 1, playerName: 'لاعب أول' });
    c.basicDrafts.editText.set('لاعب ثانٍ');
    await c.playersEditor.save(1);
    expect(apiStub.update).toHaveBeenCalledWith('players', 1, { playerName: 'لاعب ثانٍ' });
    expect(c.msg()).toBe('اسم اللاعب مستخدم بالفعل');
    expect(toast.error).toHaveBeenCalledWith('اسم اللاعب مستخدم بالفعل');
    // The row stays open so the referee can fix the clash.
    expect(c.selection.editingId()).toBe(1);
    await drainList(httpMock);
  });

  it('cancel closes the inline form without calling the backend', async () => {
    const { fixture, apiStub, httpMock } = await setupEdit();
    const c = fixture.componentInstance;
    c.playersEditor.start({ id: 1, playerName: 'لاعب أول' });
    c.selection.cancelEdit();
    fixture.detectChanges();
    expect(c.selection.editingId()).toBeNull();
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
    c.top10Editor.startEdit({ id: 5, prompt: 'عنوان', answers: Array(13).fill('إجابة') });
    c.top10Editor.setEditAnswer(12, '');
    await c.top10Editor.save(5);
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
    c.riskEditor.startEdit({
      id: 9,
      genre: 'ريال مدريد',
      questions: [
        { points: 5, question: 'س0', answer: 'ج0' },
        { points: 10, question: 'س1', answer: 'ج1' },
        { points: 20, question: 'س2', answer: 'ج2' },
        { points: 40, question: 'س3', answer: 'ج3' },
      ],
    });
    c.riskEditor.setEditRisk(3, 'answer', '');
    await c.riskEditor.save(9);
    expect(apiStub.update).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalled();
    expect(c.msg()).toContain('أربعة');
  });

  it('adds a bank question and a risk pack through their own endpoints', async () => {
    const { fixture, apiStub, httpMock } = await setupEdit();
    const c = fixture.componentInstance;

    c.basicDrafts.addQuestion.set('سؤال البنك');
    c.basicDrafts.addAnswer.set('الجواب');
    await c.bankEditor.add();
    expect(apiStub.addBank).toHaveBeenCalledWith('سؤال البنك', 'الجواب');
    await drainList(httpMock);

    c.select('risk');
    fixture.detectChanges();
    httpMock
      .expectOne((r) => r.url.includes('/risk/all'))
      .flush({ content: [], totalElements: 0, totalPages: 0, number: 0, size: 20 });
    c.riskEditor.newGenre.set('ريال مدريد');
    for (const i of [0, 1, 2, 3]) {
      c.riskEditor.setNewRisk(i, 'question', `سؤال ${i}`);
      c.riskEditor.setNewRisk(i, 'answer', `جواب ${i}`);
    }
    await c.riskEditor.add();
    expect(apiStub.addRisk).toHaveBeenCalledWith('ريال مدريد', [
      { points: 5, question: 'سؤال 0', answer: 'جواب 0' },
      { points: 10, question: 'سؤال 1', answer: 'جواب 1' },
      { points: 20, question: 'سؤال 2', answer: 'جواب 2' },
      { points: 40, question: 'سؤال 3', answer: 'جواب 3' },
    ]);
    await drainList(httpMock, 'risk');
  });
});
