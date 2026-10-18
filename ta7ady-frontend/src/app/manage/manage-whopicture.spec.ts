import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';

import { setupV4, showV4, drainList, names11, TITLE } from './testing/manage-v4-fixtures';

describe('ManageComponent v4 pools', () => {
  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
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
    expect(c.selection.expandedId()).toBe(11);
    const reveal = el.querySelector('.reveal') as HTMLElement;
    expect(reveal.querySelectorAll('li').length).toBe(11);
    expect(reveal.textContent).toContain('لاعب 11');
    expect(el.querySelector('.wp-preview img')?.getAttribute('src')).toBe(
      'https://example.com/p.jpg',
    );
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

  it('edits a whopicture row prefilled and PUTs title + url + 11 names', async () => {
    const { fixture, apiStub, toast, httpMock } = await setupV4();
    const c = fixture.componentInstance;
    await showV4(fixture, httpMock, 'whopicture', [
      { id: 11, title: TITLE, photoUrl: 'https://example.com/p.jpg', players: names11 },
    ]);
    (fixture.nativeElement.querySelector('.edit-btn') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(c.selection.editingId()).toBe(11);
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
    c.whopictureEditor.startEdit({
      id: 11,
      title: TITLE,
      photoUrl: 'https://example.com/p.jpg',
      players: names11,
    });
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
});
