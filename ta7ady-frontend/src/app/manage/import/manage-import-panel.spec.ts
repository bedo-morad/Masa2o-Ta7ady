import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { signal } from '@angular/core';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { HotToastService } from '@ngxpert/hot-toast';
import { ApiService, BulkRowResult, Pool } from '../../api.service';
import { ImportPanelComponent } from './import-panel.component';

function setup(pool: Pool = 'players', bulkImpl?: (p: Pool, r: unknown[], d: boolean) => unknown) {
  const bulk = vi.fn(
    bulkImpl ?? (() => of([] as BulkRowResult[])),
  );
  const toast = { success: vi.fn(), error: vi.fn() };
  const apiStub = {
    adminPassword: signal<string | null>(null),
    bulk,
    unlock: vi.fn(),
    lock: vi.fn(),
  };
  TestBed.configureTestingModule({
    imports: [ImportPanelComponent],
    providers: [
      provideHttpClient(),
      { provide: ApiService, useValue: apiStub },
      { provide: HotToastService, useValue: toast },
    ],
  });
  const fixture = TestBed.createComponent(ImportPanelComponent);
  fixture.componentRef.setInput('pool', pool);
  fixture.detectChanges();
  return { fixture, apiStub, bulk, toast };
}

describe('ImportPanelComponent', () => {
  it('creates with a schema hint for the active pool', () => {
    const { fixture } = setup('top10');
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('13');
    expect(fixture.componentInstance).toBeTruthy();
  });

  // SPECV4: the two new pools show their own bulk schema hints.
  describe('v4 pools', () => {
    it('shows the anameen 5-ordered-clue schema', () => {
      const { fixture } = setup('anameen');
      fixture.detectChanges();
      const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
      expect(text).toContain('من أنا؟');
      expect(text).toContain('5');
      expect(text).toContain('clues');
    });

    it('shows the whopicture title + URL + 11-name schema', () => {
      const { fixture } = setup('whopicture');
      fixture.detectChanges();
      const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
      expect(text).toContain('مين في الصورة');
      expect(text).toContain('title');
      expect(text).toContain('photoUrl');
      expect(text).toContain('11');
    });
  });

  it('rejects invalid JSON with a clear error', async () => {
    const { fixture } = setup();
    const c = fixture.componentInstance;
    c.raw.set('not json {{{');
    await c.parse();
    fixture.detectChanges();
    expect(c.parseError()).toContain('JSON');
    expect(c.hasParsed()).toBe(false);
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('JSON');
  });

  it('rejects a non-array payload', async () => {
    const { fixture } = setup();
    const c = fixture.componentInstance;
    c.raw.set('{"playerName": "x"}');
    await c.parse();
    fixture.detectChanges();
    expect(c.parseError()).toContain('مصفوفة');
    expect(c.hasParsed()).toBe(false);
  });

  it('renders the dry-run preview with per-row reasons from a mocked bulk() response', async () => {
    const preview: BulkRowResult[] = [
      { index: 0, ok: true, errors: [], id: 11 },
      { index: 1, ok: false, errors: ['duplicate in file'] },
    ];
    const { fixture, bulk } = setup('players', () => of(preview));
    const c = fixture.componentInstance;
    c.raw.set('[{"playerName": "أشرف حكيمي"}, {"playerName": "أشرف حكيمي"}]');
    await c.parse();
    expect(c.hasParsed()).toBe(true);
    await c.dryRun();
    fixture.detectChanges();
    expect(bulk).toHaveBeenCalledWith('players', expect.any(Array), true);
    expect(c.preview()).toEqual(preview);
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('صالح');
    expect(el.textContent).toContain('غير صالح');
    expect(el.textContent).toContain('duplicate in file');
    // Nothing saves before confirm: dry-run only previews.
    expect(el.querySelector('.summary')).toBeNull();
  });

  it('confirms with dryRun=false and shows the saved summary', async () => {
    const committed: BulkRowResult[] = [{ index: 0, ok: true, errors: [], id: 42 }];
    const calls: boolean[] = [];
    const { fixture, bulk, toast } = setup('players', (_p, _r, dry) => {
      calls.push(dry);
      return of(dry ? [{ index: 0, ok: true, errors: [] }] : committed);
    });
    const c = fixture.componentInstance;
    c.raw.set('[{"playerName": "لاعب جديد تمامًا"}]');
    await c.parse();
    await c.dryRun();
    await c.confirm();
    fixture.detectChanges();
    expect(bulk).toHaveBeenLastCalledWith('players', expect.any(Array), false);
    expect(calls).toEqual([true, false]);
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('تم الحفظ');
    expect(el.textContent).toContain('42');
    expect(toast.success).toHaveBeenCalledWith(expect.stringContaining('1'));
  });

  it('toasts the backend message when import confirm fails', async () => {
    const { fixture, toast } = setup('players', (_p, _r, dry) =>
      dry
        ? of([{ index: 0, ok: true, errors: [] }])
        : throwError(() => ({ error: { message: 'سبب الرفض من الخادم' } })),
    );
    const c = fixture.componentInstance;
    c.raw.set('[{"playerName": "لاعب جديد تمامًا"}]');
    await c.parse();
    await c.dryRun();
    await c.confirm();
    fixture.detectChanges();
    expect(c.confirmError()).toBe('سبب الرفض من الخادم');
    expect(toast.error).toHaveBeenCalledWith('سبب الرفض من الخادم');
    expect(toast.success).not.toHaveBeenCalled();
  });
});
