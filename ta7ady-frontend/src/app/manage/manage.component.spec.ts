import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';

import { provideRouter } from '@angular/router';

import { vi } from 'vitest';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { HotToastService } from '@ngxpert/hot-toast';

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
      expect(c.selection.expandedId()).toBeNull();
      expect(c.selection.editingId()).toBeNull();
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
