import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { throwError } from 'rxjs';

import { managePools, setupCatalog } from './testing/manage-catalog-fixtures';

describe('ManageComponent catalog lifecycle', () => {
  const pools = managePools;
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
      expect(c.catalog.loading()).toBe(true);
      request.flush({ content: [], totalElements: 0, totalPages: 0, number: 0, size: 20 });
      await fixture.whenStable();
    }
  });

  it('reads and reloads every pool, exposing its rows and total through the page', async () => {
    const { fixture, httpMock } = await setupCatalog();
    const c = fixture.componentInstance;
    const fixtures: Record<
      (typeof pools)[number],
      { label: string; total: number; content: unknown[] }
    > = {
      players: {
        label: 'players fixture',
        total: 21,
        content: [{ id: 1, playerName: 'players fixture' }],
      },
      ihbid: {
        label: 'ihbid fixture',
        total: 32,
        content: [{ id: 2, questionText: 'ihbid fixture', answerText: 'answer' }],
      },
      offside: {
        label: 'offside fixture',
        total: 43,
        content: [{ id: 3, ruleText: 'offside fixture' }],
      },
      top10: {
        label: 'top10 fixture',
        total: 54,
        content: [{ id: 4, prompt: 'top10 fixture', answers: [] }],
      },
      scoresheet: {
        label: 'scoresheet fixture',
        total: 65,
        content: [
          {
            id: 5,
            matchLabel: 'scoresheet fixture',
            teamA: 'A',
            teamB: 'B',
            lineupA: [],
            lineupB: [],
          },
        ],
      },
      bank: {
        label: 'bank fixture',
        total: 76,
        content: [{ id: 6, question: 'bank fixture', answer: 'answer' }],
      },
      risk: {
        label: 'risk fixture',
        total: 87,
        content: [{ id: 7, genre: 'risk fixture', questions: [] }],
      },
      anameen: {
        label: 'anameen fixture',
        total: 98,
        content: [{ id: 8, player: 'anameen fixture', clues: [] }],
      },
      whopicture: {
        label: 'whopicture fixture',
        total: 109,
        content: [{ id: 9, title: 'whopicture fixture', photoUrl: 'https://fixture', players: [] }],
      },
    };

    const expectActivePage = (pool: (typeof pools)[number]): void => {
      const expected = fixtures[pool];
      expect((fixture.nativeElement as HTMLElement).querySelector('.rows')?.textContent).toContain(
        expected.label,
      );
      expect((fixture.nativeElement as HTMLElement).querySelector('.count')?.textContent).toContain(
        String(expected.total),
      );
    };

    for (const pool of pools) {
      const expected = fixtures[pool];
      if (pool === 'players') {
        expectActivePage(pool);
      } else {
        c.select(pool);
        fixture.detectChanges();
        const read = httpMock.expectOne((r) => r.url.includes(`/${pool}/all`));
        read.flush({
          content: expected.content,
          totalElements: expected.total,
          totalPages: 1,
          number: 0,
          size: 20,
        });
        await fixture.whenStable();
        fixture.detectChanges();
        expectActivePage(pool);
      }

      c.catalog.reloadActive();
      fixture.detectChanges();
      const reload = httpMock.expectOne((r) => r.url.includes(`/${pool}/all`));
      expect(reload.request.urlWithParams).toContain('page=0');
      expect(reload.request.urlWithParams).toContain('size=20');
      expect(reload.request.urlWithParams).toContain('sort=id,desc');
      reload.flush({
        content: expected.content,
        totalElements: expected.total,
        totalPages: 1,
        number: 0,
        size: 20,
      });
      await fixture.whenStable();
      fixture.detectChanges();
      expectActivePage(pool);
    }
  });

  it('preserves page navigation and resets selection state on paging and import refresh', async () => {
    const { fixture, httpMock } = await setupCatalog();
    const c = fixture.componentInstance;
    c.selection.expandedId.set(4);
    c.selection.editingId.set(4);
    c.next();
    fixture.detectChanges();
    const nextRequest = httpMock.expectOne((r) => r.url.includes('/players/all'));
    expect(nextRequest.request.urlWithParams).toContain('page=1');
    expect(c.selection.expandedId()).toBeNull();
    expect(c.selection.editingId()).toBeNull();
    nextRequest.flush({
      content: [{ id: 2, playerName: 'لاعب آخر' }],
      totalElements: 21,
      totalPages: 2,
      number: 1,
      size: 20,
    });
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
    await c.removeFromCatalog('players', 1);
    expect(apiStub.del).toHaveBeenCalledWith('players', 1);
    await new Promise((resolve) => setTimeout(resolve, 0));
    const refresh = httpMock.expectOne((r) => r.url.includes('/players/all'));
    refresh.flush({ content: [], totalElements: 0, totalPages: 0, number: 0, size: 20 });

    apiStub.del.mockReturnValueOnce(throwError(() => ({ status: 500 })));
    await c.removeFromCatalog('players', 1);
    expect(c.msg()).toBe('تعذّر الحذف — أعد المحاولة.');

    apiStub.del.mockReturnValueOnce(throwError(() => ({ status: 401 })));
    await c.removeFromCatalog('players', 1);
    expect(apiStub.lock).toHaveBeenCalled();
    expect(c.admin.error()).toBe('كلمة المرور غير صحيحة.');
  });
});
