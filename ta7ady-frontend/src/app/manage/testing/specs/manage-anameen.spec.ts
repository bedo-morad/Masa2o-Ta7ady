import { throwError } from 'rxjs';
import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';

import { setupV4, showV4, drainList, clues5 } from '../manage-v4-fixtures';

describe('ManageComponent v4 pools', () => {
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
    expect(c.selection.expandedId()).toBe(4);
    const reveal = el.querySelector('.reveal') as HTMLElement;
    expect(reveal.querySelectorAll('li').length).toBe(5);
    expect(reveal.textContent).toContain('تلميح 5');
  });

  it('blocks an anameen add until the name and all 5 clues are filled', async () => {
    const { fixture, apiStub, toast, httpMock } = await setupV4();
    const c = fixture.componentInstance;
    c.select('anameen');
    fixture.detectChanges();
    httpMock
      .expectOne((r) => r.url.includes('/anameen/all'))
      .flush({ content: [], totalElements: 0, totalPages: 0, number: 0, size: 20 });
    c.anameenEditor.subject.set('محمد صلاح');
    c.anameenEditor.clues.set([...clues5].map((v, i) => (i === 4 ? '' : v)));
    await c.anameenEditor.add();
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
    c.anameenEditor.subject.set('محمد صلاح');
    c.anameenEditor.clues.set([...clues5]);
    await c.anameenEditor.add();
    expect(apiStub.addAnameen).toHaveBeenCalledWith('محمد صلاح', clues5);
    expect(toast.success).toHaveBeenCalledWith('تمت إضافة الشخصية (#7).');
    expect(c.anameenEditor.subject()).toBe('');
    expect(c.anameenEditor.clues().every((v) => v === '')).toBe(true);
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
    c.anameenEditor.subject.set('محمد صلاح');
    c.anameenEditor.clues.set([...clues5]);
    apiStub.addAnameen.mockReturnValueOnce(
      throwError(() => ({ error: { message: 'المستخدم موجود بالفعل' } })),
    );
    await c.anameenEditor.add();
    expect(c.msg()).toBe('المستخدم موجود بالفعل');
    expect(toast.error).toHaveBeenCalledWith('المستخدم موجود بالفعل');
  });

  it('edits an anameen row prefilled and PUTs the same body shape as create', async () => {
    const { fixture, apiStub, toast, httpMock } = await setupV4();
    const c = fixture.componentInstance;
    await showV4(fixture, httpMock, 'anameen', [{ id: 4, player: 'محمد صلاح', clues: clues5 }]);
    const el = fixture.nativeElement as HTMLElement;
    (el.querySelector('.edit-btn') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(c.selection.editingId()).toBe(4);
    expect(c.anameenEditor.editSubject()).toBe('محمد صلاح');
    expect(c.anameenEditor.editClues()).toEqual(clues5);

    c.anameenEditor.editSubject.set('منصور');
    await c.anameenEditor.save(4);
    expect(apiStub.update).toHaveBeenCalledWith('anameen', 4, { player: 'منصور', clues: clues5 });
    expect(toast.success).toHaveBeenCalledWith('تم حفظ تعديل الشخصية (#4).');
    expect(c.selection.editingId()).toBeNull();
    await drainList(httpMock, 'anameen');
  });

  it('rejects an anameen duplicate-of-another via the backend message and stays open', async () => {
    const { fixture, apiStub, toast, httpMock } = await setupV4();
    const c = fixture.componentInstance;
    apiStub.update.mockReturnValueOnce(
      throwError(() => ({ error: { message: 'المستخدم موجود بالفعل' } })),
    );
    c.anameenEditor.startEdit({ id: 4, player: 'محمد صلاح', clues: clues5 });
    c.anameenEditor.editSubject.set('اسم مستخدم آخر');
    await c.anameenEditor.save(4);
    expect(apiStub.update).toHaveBeenCalledWith('anameen', 4, {
      player: 'اسم مستخدم آخر',
      clues: clues5,
    });
    expect(c.msg()).toBe('المستخدم موجود بالفعل');
    expect(toast.error).toHaveBeenCalledWith('المستخدم موجود بالفعل');
    expect(c.selection.editingId()).toBe(4);
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
    c.anameenEditor.startEdit({ id: 4, player: 'محمد صلاح', clues: clues5 });
    c.anameenEditor.setEditClue(4, '');
    await c.anameenEditor.save(4);
    expect(apiStub.update).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalled();
    expect(c.msg()).toContain('خمس');
  });

  it('deletes through the generic admin-gated del(pool, id)', async () => {
    const { fixture, apiStub, httpMock } = await setupV4();
    const c = fixture.componentInstance;
    await showV4(fixture, httpMock, 'anameen', [{ id: 4, player: 'محمد صلاح', clues: clues5 }]);
    await c.removeFromCatalog('anameen', 4);
    expect(apiStub.del).toHaveBeenCalledWith('anameen', 4);
    await drainList(httpMock, 'anameen');
  });
});
